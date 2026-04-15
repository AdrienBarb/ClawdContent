/**
 * One-time migration: update Pro/Business Fly.io machines to autostop: "off"
 *
 * Run with:
 *   node scripts/migrate-always-on.mjs
 *
 * Or dry-run (no changes):
 *   DRY_RUN=true node scripts/migrate-always-on.mjs
 */

import { config } from "dotenv";
config({ path: ".env" });           // Fly.io credentials
config({ path: ".env.production", override: true }); // Production DB (overrides .env)

import pg from "pg";

const DRY_RUN = process.env.DRY_RUN === "true";
const FLY_API_BASE = "https://api.machines.dev/v1";
const FLY_API_TOKEN = process.env.FLY_API_TOKEN;
const FLY_APP_NAME = process.env.FLY_APP_NAME;
const DATABASE_URL = process.env.DATABASE_URL;

if (!FLY_API_TOKEN) throw new Error("Missing FLY_API_TOKEN");
if (!FLY_APP_NAME) throw new Error("Missing FLY_APP_NAME");
if (!DATABASE_URL) throw new Error("Missing DATABASE_URL");

if (DRY_RUN) console.log("🔍 DRY RUN — no changes will be made\n");

// Allow self-signed certs for Supabase
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// ─── DB ──────────────────────────────────────────────────────────

const pool = new pg.Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function getAlwaysOnMachines() {
  const result = await pool.query(`
    SELECT
      fm."machineId",
      fm."userId",
      fm.status,
      s."planId",
      u.email
    FROM fly_machine fm
    JOIN subscription s ON s."userId" = fm."userId"
    JOIN "user" u ON u.id = fm."userId"
    WHERE s."planId" IN ('pro', 'business')
      AND s.status = 'active'
      AND fm."machineId" != 'pending'
      AND fm.status != 'failed'
    ORDER BY s."planId", u.email
  `);
  return result.rows;
}

// ─── Fly API ─────────────────────────────────────────────────────

async function flyRequest(path, options = {}) {
  const { method = "GET", body } = options;
  const response = await fetch(`${FLY_API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${FLY_API_TOKEN}`,
    },
    ...(body && { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Fly API error (${response.status}): ${text}`);
  }

  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return response.json();
  }
  return {};
}

async function getMachine(machineId) {
  return flyRequest(`/apps/${FLY_APP_NAME}/machines/${machineId}`);
}

async function updateMachineAutoStop(machineId, autoStop) {
  const current = await getMachine(machineId);

  // Update autostop on all services
  const services = (current.config.services ?? []).map((svc) => ({
    ...svc,
    autostop: autoStop ? "stop" : "off",
  }));

  return flyRequest(`/apps/${FLY_APP_NAME}/machines/${machineId}`, {
    method: "POST",
    body: {
      config: {
        ...current.config,
        services,
      },
    },
  });
}

// ─── Main ─────────────────────────────────────────────────────────

async function main() {
  console.log(`Fetching Pro/Business machines from DB...`);
  const machines = await getAlwaysOnMachines();

  if (machines.length === 0) {
    console.log("No Pro/Business active machines found.");
    await pool.end();
    return;
  }

  console.log(`Found ${machines.length} machine(s) to update:\n`);
  for (const m of machines) {
    console.log(`  [${m.planId.toUpperCase()}] ${m.email} — machine: ${m.machineId} (status: ${m.status})`);
  }
  console.log();

  let success = 0;
  let failed = 0;

  for (const m of machines) {
    process.stdout.write(`  Updating ${m.email} (${m.machineId})... `);

    if (DRY_RUN) {
      console.log("skipped (dry run)");
      continue;
    }

    try {
      await updateMachineAutoStop(m.machineId, false); // false = always on
      console.log("✓ done");
      success++;
    } catch (err) {
      console.log(`✗ FAILED: ${err.message}`);
      failed++;
    }
  }

  if (!DRY_RUN) {
    console.log(`\nDone: ${success} updated, ${failed} failed.`);
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
