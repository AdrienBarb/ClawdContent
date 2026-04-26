#!/usr/bin/env tsx
/**
 * Backfill insights for SocialAccounts that have never been analyzed.
 *
 * Targets SocialAccount where:
 *   - status         = 'active'        (account currently connected)
 *   - analysisStatus = 'pending'       (computeInsights() never set it to 'completed')
 *
 * Fires one `account/refresh-insights` Inngest event per matching account.
 * Inngest handles retries; the function itself is idempotent (overwrites insights).
 *
 * Usage:
 *   tsx scripts/backfill-insights.ts                       # DRY RUN (default)
 *   tsx scripts/backfill-insights.ts --apply               # actually fire events
 *   tsx scripts/backfill-insights.ts --apply --user-id X   # only one user
 *   tsx scripts/backfill-insights.ts --apply --limit 5     # only first N
 *
 * Required env vars: DATABASE_URL, INNGEST_EVENT_KEY (in prod) or local dev server.
 */
import "dotenv/config";
import * as readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Inngest } from "inngest";

// ── Args ──────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const apply = args.includes("--apply");
const userIdIdx = args.indexOf("--user-id");
const userId = userIdIdx !== -1 ? args[userIdIdx + 1] : undefined;
const limitIdx = args.indexOf("--limit");
const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : undefined;

// ── Setup ─────────────────────────────────────────────────────────────────────
if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set.");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Pass eventKey explicitly: the SDK otherwise auto-switches to dev mode when
// NODE_ENV !== "production" and silently drops events.
const inngest = new Inngest({
  id: "postclaw",
  eventKey: process.env.INNGEST_EVENT_KEY,
  isDev: false,
});

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const dbHost = new URL(process.env.DATABASE_URL!).host;
  const eventKeySet = !!process.env.INNGEST_EVENT_KEY;

  console.log("\n──────────────────────────────────────────────");
  console.log(`📡 Database         : ${dbHost}`);
  console.log(`🔑 INNGEST_EVENT_KEY : ${eventKeySet ? "set (cloud)" : "not set (dev server)"}`);
  console.log(`🎯 Mode             : ${apply ? "🚨 APPLY" : "🧪 DRY RUN"}`);
  if (userId) console.log(`👤 Filter user      : ${userId}`);
  if (limit) console.log(`🔢 Limit            : ${limit}`);
  console.log("──────────────────────────────────────────────\n");

  const accounts = await prisma.socialAccount.findMany({
    where: {
      status: "active",
      analysisStatus: "pending",
      ...(userId && { lateProfile: { userId } }),
    },
    include: {
      lateProfile: { include: { user: { select: { email: true } } } },
    },
    orderBy: { createdAt: "asc" },
    ...(limit && { take: limit }),
  });

  console.log(`Found ${accounts.length} active accounts pending analysis:\n`);
  const preview = accounts.slice(0, 30);
  for (const a of preview) {
    console.log(
      `  • ${a.platform.padEnd(10)} @${a.username.padEnd(28)} ${a.lateProfile.user.email}  [${a.id}]`
    );
  }
  if (accounts.length > preview.length) {
    console.log(`  … and ${accounts.length - preview.length} more`);
  }

  if (accounts.length === 0) {
    console.log("\n✅ Nothing to backfill. Done.");
    process.exit(0);
  }

  if (!apply) {
    console.log("\n👀 Dry run only — no events fired. Re-run with --apply to backfill.\n");
    process.exit(0);
  }

  // ── Confirmation prompt ─────────────────────────────────────────────────────
  const rl = readline.createInterface({ input: stdin, output: stdout });
  const answer = await rl.question(
    `\n⚠️  About to fire ${accounts.length} 'account/refresh-insights' Inngest events on ${dbHost}.\n   Type "yes" to continue: `
  );
  rl.close();

  if (answer.trim().toLowerCase() !== "yes") {
    console.log("Aborted.");
    process.exit(0);
  }

  // ── Fire events (throttled) ─────────────────────────────────────────────────
  let success = 0;
  let failed = 0;
  for (const account of accounts) {
    try {
      await inngest.send({
        name: "account/refresh-insights",
        data: { socialAccountId: account.id },
      });
      success++;
      console.log(`  ✓ ${account.platform.padEnd(10)} @${account.username}`);
    } catch (e) {
      failed++;
      console.error(`  ✗ ${account.platform} @${account.username} →`, e);
    }
    // 100 ms between sends → max 10 events/s into Inngest
    await new Promise((r) => setTimeout(r, 100));
  }

  console.log(`\n✅ Done. Sent: ${success}  Failed: ${failed}`);
  console.log(
    "Inngest will now process each event. Watch the dashboard at https://app.inngest.com or your local dev server.\n"
  );
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("\n💥 Fatal:", e);
  process.exit(1);
});
