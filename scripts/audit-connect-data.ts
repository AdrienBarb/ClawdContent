#!/usr/bin/env tsx
/**
 * AUDIT: what data PostClaw actually receives from a connected social account.
 *
 * Read-only. Replays the EXACT Zernio (a.k.a. "Late") API calls the connect /
 * analyze-account flow makes for one or more already-connected accounts, and
 * dumps the raw responses so you can see, field by field, what comes back —
 * and which fields PostClaw keeps vs drops.
 *
 * It performs GET requests ONLY. It never posts, schedules, deletes, or mutates
 * anything (honours the "never act on real user accounts" rule — read-only debug).
 *
 * Usage:
 *   tsx scripts/audit-connect-data.ts <email>                  # all accounts for a user
 *   tsx scripts/audit-connect-data.ts --account <socialAccountId>
 *   tsx scripts/audit-connect-data.ts --profile <lateProfileId>
 *   tsx scripts/audit-connect-data.ts <email> --raw            # also print full raw JSON
 *   tsx scripts/audit-connect-data.ts <email> --master         # use master key, not scoped
 *
 * Required env: DATABASE_URL, and ZERNIO_API_KEY (or LATE_API_KEY) for --master.
 * Without --master it uses each LateProfile's own scoped key from the DB — the
 * same key the real connect flow uses, so the payloads match production exactly.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const ZERNIO_API_BASE = "https://zernio.com/api/v1";

// ---- platform table (mirrors src/lib/insights/platformConfig.ts) -----------
// Only the bits the connect-time fetch branches on.
const PLATFORMS: Record<
  string,
  { primaryMetric: "likes" | "views" | "saves"; supportsAnalytics: boolean; noExternalHistory: boolean }
> = {
  instagram: { primaryMetric: "likes", supportsAnalytics: true, noExternalHistory: false },
  facebook: { primaryMetric: "likes", supportsAnalytics: true, noExternalHistory: false },
  twitter: { primaryMetric: "likes", supportsAnalytics: true, noExternalHistory: false },
  threads: { primaryMetric: "likes", supportsAnalytics: true, noExternalHistory: false },
  tiktok: { primaryMetric: "views", supportsAnalytics: true, noExternalHistory: false },
  youtube: { primaryMetric: "views", supportsAnalytics: true, noExternalHistory: false },
  pinterest: { primaryMetric: "saves", supportsAnalytics: true, noExternalHistory: false },
  linkedin: { primaryMetric: "likes", supportsAnalytics: true, noExternalHistory: true },
  bluesky: { primaryMetric: "likes", supportsAnalytics: false, noExternalHistory: true },
};

const POST_LIMIT = 20; // zernioContext.ts
function pickSortBy(primary: string): string {
  if (primary === "views") return "views";
  if (primary === "saves") return "saves";
  return "engagement";
}

// ---- minimal read-only Zernio GET client -----------------------------------
async function zget<T>(path: string, apiKey: string): Promise<{ ok: boolean; status: number; data: T | string }> {
  const res = await fetch(`${ZERNIO_API_BASE}${path}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
  });
  const text = await res.text();
  let data: T | string;
  try {
    data = JSON.parse(text) as T;
  } catch {
    data = text;
  }
  return { ok: res.ok, status: res.status, data };
}

// ---- helpers ----------------------------------------------------------------
const C = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
};

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const RAW = process.argv.includes("--raw");
const USE_MASTER = process.argv.includes("--master");

function header(s: string) {
  console.log("\n" + C.bold(C.cyan("━".repeat(72))));
  console.log(C.bold(C.cyan(s)));
  console.log(C.bold(C.cyan("━".repeat(72))));
}

function call(label: string, path: string) {
  console.log(`\n${C.bold("→ " + label)}\n  ${C.dim("GET " + path)}`);
}

function result(r: { ok: boolean; status: number; data: unknown }, keep: string) {
  if (!r.ok) {
    console.log(`  ${C.red(`✗ ${r.status}`)} ${C.dim(typeof r.data === "string" ? r.data.slice(0, 160) : JSON.stringify(r.data).slice(0, 160))}`);
    return;
  }
  console.log(`  ${C.green(`✓ ${r.status}`)}  ${C.dim("PostClaw keeps → " + keep)}`);
  if (RAW) console.log(C.dim(indent(JSON.stringify(r.data, null, 2), 4)));
}

function indent(s: string, n: number): string {
  const pad = " ".repeat(n);
  return s.split("\n").map((l) => pad + l).join("\n");
}

// ---- main -------------------------------------------------------------------
async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  const accountId = flag("--account");
  const profileFlag = flag("--profile");
  const positional = process.argv.slice(2).find((a) => !a.startsWith("--") && a !== accountId && a !== profileFlag);

  // Resolve the set of LateProfiles + their accounts to audit.
  const profiles = await prisma.lateProfile.findMany({
    where: accountId
      ? { socialAccounts: { some: { id: accountId } } }
      : profileFlag
        ? { lateProfileId: profileFlag }
        : positional
          ? { user: { email: positional } }
          : undefined,
    include: {
      user: { select: { email: true, knowledgeBase: true } },
      socialAccounts: accountId ? { where: { id: accountId } } : true,
    },
  });

  if (profiles.length === 0) {
    console.error(C.red("No matching LateProfile found. Pass an <email>, --account <id>, or --profile <id>."));
    process.exit(1);
  }

  const masterKey = process.env.ZERNIO_API_KEY ?? process.env.LATE_API_KEY;
  if (USE_MASTER && !masterKey) {
    console.error(C.red("--master requested but ZERNIO_API_KEY / LATE_API_KEY is not set."));
    process.exit(1);
  }

  for (const profile of profiles) {
    const apiKey = USE_MASTER ? masterKey! : profile.lateApiKey;
    header(`LateProfile ${profile.lateProfileId}  (${profile.user?.email ?? "?"})  key=${USE_MASTER ? "MASTER" : "scoped"}`);

    // 1) Account discovery — what syncAccountsFromLate() reads on the connect callback.
    call("accounts/health  [discovery: status, tokenValid, needsReconnect]", `/accounts/health?profileId=${profile.lateProfileId}`);
    const health = await zget(`/accounts/health?profileId=${profile.lateProfileId}`, apiKey);
    result(health, "accountId, platform, username, (tokenValid && !needsReconnect) → status");

    const accounts = profile.socialAccounts;
    if (accounts.length === 0) {
      console.log(C.yellow("\n  (no SocialAccount rows in DB for this profile)"));
      continue;
    }

    // 2) Per-account: replay the analyze-account / computeInsights fetch sequence.
    for (const acc of accounts) {
      const cfg = PLATFORMS[acc.platform] ?? { primaryMetric: "likes" as const, supportsAnalytics: true, noExternalHistory: false };
      const skipPostFetch = !cfg.supportsAnalytics || cfg.noExternalHistory; // (source="external" at connect)
      const sortBy = pickSortBy(cfg.primaryMetric);
      const limit = skipPostFetch ? 1 : POST_LIMIT;

      console.log("\n" + C.bold(`  ── @${acc.username} (${acc.platform}) ── lateAccountId=${acc.lateAccountId}`));
      console.log(
        C.dim(
          `     primaryMetric=${cfg.primaryMetric} supportsAnalytics=${cfg.supportsAnalytics} noExternalHistory=${cfg.noExternalHistory} → connect uses source="external", skipPostFetch=${skipPostFetch}, limit=${limit}`
        )
      );

      // 2a) getAnalytics — accountMeta (followers/displayName) + posts (+ per-post metrics)
      const aPath = `/analytics?source=external&platform=${acc.platform}&sortBy=${sortBy}&order=desc&limit=${limit}`;
      call("analytics  [accountMeta + top posts + per-post metrics]", aPath);
      const analytics = await zget<{
        overview?: { dataStaleness?: { syncTriggered?: boolean } };
        posts?: unknown[];
        accounts?: unknown[];
      }>(aPath, apiKey);
      result(
        analytics,
        "accounts[].{followersCount,displayName}; posts[].{content,publishedAt,mediaType,analytics.{impressions,reach,likes,comments,shares,saves,views,engagementRate}} (top 5 only)"
      );
      if (analytics.ok && typeof analytics.data === "object") {
        const d = analytics.data as { posts?: unknown[]; accounts?: unknown[]; overview?: { dataStaleness?: { syncTriggered?: boolean } } };
        console.log(
          C.dim(
            `     ↳ posts=${d.posts?.length ?? 0}  accounts=${d.accounts?.length ?? 0}  syncTriggered=${d.overview?.dataStaleness?.syncTriggered ?? false}`
          )
        );
      }

      if (skipPostFetch) {
        console.log(C.yellow("     (post-derived calls skipped at connect for this platform — dataQuality=platform_no_history)"));
        continue;
      }

      // 2b) follower-stats — 30d growth
      const fPath = `/accounts/follower-stats?accountIds=${acc.lateAccountId}`;
      call("accounts/follower-stats  [30d growth]", fPath);
      const followers = await zget(fPath, apiKey);
      result(followers, "accounts[].{growth → growth30d, growthPercentage → growth30dPercentage}  (time series 'stats' dropped)");

      // 2c) best-time (only fetched when posts > 0 in real flow)
      const btPath = `/analytics/best-time?platform=${acc.platform}&source=all`;
      call("analytics/best-time  [best posting slots]", btPath);
      const bestTime = await zget(btPath, apiKey);
      result(bestTime, "slots[].{day_of_week,hour,avg_engagement,post_count}");

      // 2d) posting-frequency (only fetched when posts > 0 in real flow)
      const pfPath = `/analytics/posting-frequency?platform=${acc.platform}&source=all`;
      call("analytics/posting-frequency  [cadence]", pfPath);
      const freq = await zget(pfPath, apiKey);
      result(freq, "summarised → {avgPostsPerWeek,bestPostsPerWeek,weeksObserved}  (raw per-platform rows dropped)");
    }
  }

  console.log("\n" + C.dim("Done. Read-only — no accounts were modified."));
  console.log(
    C.dim(
      "Not replayed here (defined in mutations.ts but NOT part of connect): /analytics/daily-metrics, /logs, /posts. Add --raw to dump full JSON bodies."
    )
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
