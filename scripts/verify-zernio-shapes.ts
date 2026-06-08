#!/usr/bin/env tsx
/**
 * READ-ONLY ground-truth probe: what does Zernio REALLY return for IG vs FB?
 * GET requests only. Redacts post captions (shows length only). Never prints the key.
 * Usage: LATE_API_KEY=sk_... npx tsx scripts/verify-zernio-shapes.ts
 */
const KEY = process.env.LATE_API_KEY;
const BASE = "https://zernio.com/api/v1";
if (!KEY) {
  console.error("Missing LATE_API_KEY env var");
  process.exit(1);
}

async function get(path: string): Promise<{ status: number; data: unknown }> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
  });
  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    data = text.slice(0, 300);
  }
  return { status: res.status, data };
}

const SENSITIVE = /content|text|caption|message|title/i;
function shape(v: unknown, depth = 0): unknown {
  if (v === null) return "null";
  if (Array.isArray(v)) return v.length === 0 ? "[]" : [`(${v.length} items)`, shape(v[0], depth + 1)];
  if (typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (SENSITIVE.test(k) && typeof val === "string") out[k] = `<string:${val.length} chars REDACTED>`;
      else if (val !== null && typeof val === "object") out[k] = depth < 3 ? shape(val, depth + 1) : typeof val;
      else out[k] = typeof val === "string" ? `<string>` : val; // numbers/booleans shown as-is
    }
    return out;
  }
  return typeof v;
}

function dump(label: string, r: { status: number; data: unknown }) {
  console.log(`\n### ${label}  → HTTP ${r.status}`);
  console.log(JSON.stringify(shape(r.data), null, 2));
}

async function main() {
  // Full-access key: list profiles, then scope analytics by profileId.
  const profs = await get(`/profiles?limit=200`);
  console.log("=".repeat(70));
  console.log(`PROFILES → HTTP ${profs.status}`);
  console.log("=".repeat(70));
  const profileList: Array<{ _id?: string; id?: string }> =
    ((profs.data as { profiles?: unknown[] })?.profiles as never) ??
    (Array.isArray(profs.data) ? (profs.data as never) : []);
  console.log(`profiles found: ${profileList.length}`);
  if (profileList.length > 0) console.log("profile shape:", JSON.stringify(shape(profileList[0]), null, 2));

  // Find a profile with BOTH IG + FB (fallback: at least one), scanning up to 60.
  let chosen: { pid: string; accounts: Array<{ _id: string; platform: string }> } | null = null;
  let scanned = 0;
  for (const p of profileList) {
    if (scanned >= 60) break;
    const pid = (p._id ?? p.id) as string;
    if (!pid) continue;
    scanned += 1;
    const accs = await get(`/accounts?profileId=${pid}`);
    const acctList = ((accs.data as { accounts?: Array<{ _id: string; platform: string }> })?.accounts) ?? [];
    const platforms = new Set(acctList.map((a) => a.platform));
    if (platforms.has("instagram") && platforms.has("facebook")) { chosen = { pid, accounts: acctList }; break; }
    if (!chosen && (platforms.has("instagram") || platforms.has("facebook"))) chosen = { pid, accounts: acctList };
  }

  if (!chosen) { console.log(`\nNo profile with IG/FB accounts found (scanned ${scanned}).`); return; }
  console.log(`\nChosen profile (scanned ${scanned}): accounts =`, chosen.accounts.map((a) => a.platform).join(", "));
  console.log("account shape:", JSON.stringify(shape(chosen.accounts[0]), null, 2));

  for (const platform of ["instagram", "facebook"]) {
    const acc = chosen.accounts.find((a) => a.platform === platform);
    if (!acc) { console.log(`\n(no ${platform} account on this profile)`); continue; }
    dump(
      `ANALYTICS ${platform} (limit 3, source=all)`,
      await get(`/analytics?profileId=${chosen.pid}&platform=${platform}&limit=3&source=all&sortBy=engagement&order=desc`)
    );
    dump(`BEST-TIME ${platform}`, await get(`/analytics/best-time?profileId=${chosen.pid}&platform=${platform}&source=all`));
    dump(`POSTING-FREQUENCY ${platform}`, await get(`/analytics/posting-frequency?profileId=${chosen.pid}&platform=${platform}&source=all`));
    dump(`FOLLOWER-STATS ${platform}`, await get(`/accounts/follower-stats?accountIds=${acc._id}`));
  }
  dump(`ACCOUNTS/HEALTH`, await get(`/accounts/health?profileId=${chosen.pid}`));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
