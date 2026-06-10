import { inngest } from "../client";
import { prisma } from "@/lib/db/prisma";
import { computeInsights } from "@/lib/services/accountInsights";
import { computeStrategy } from "@/lib/services/socialStrategy";
import { probeSyncStatus, RICH_THRESHOLD } from "@/lib/services/zernioContext";

// Bounded poll-with-early-exit for Zernio's async backfill. Instead of one blind
// 60s wait, we probe every PROBE_INTERVAL and stop the moment the data is ready,
// capped at MAX_PROBES iterations (≈60s). Fast accounts finish in ~10-15s; slow
// accounts still get the full window, so data quality never regresses.
const PROBE_INTERVAL_SECONDS = 10;
const PROBE_INTERVAL = `${PROBE_INTERVAL_SECONDS}s`; // single source of truth — keeps the log math in sync
const MAX_PROBES = 6; // 6 × 10s = 60s ceiling (matches the old fixed sleep)

async function markAnalysisCompleted(socialAccountId: string): Promise<void> {
  await prisma.socialAccount.updateMany({
    where: { id: socialAccountId },
    data: { analysisStatus: "completed" },
  });
}

export const analyzeAccount = inngest.createFunction(
  { id: "analyze-account", retries: 3, triggers: [{ event: "account/connected" }] },
  async ({ event, step }) => {
    const { socialAccountId } = event.data as { socialAccountId: string };

    // First pass — Zernio may still be backfilling, in which case insights
    // come back with syncTriggered=true and the post list is shallow.
    let insights = await step.run("compute-insights", async () => {
      return computeInsights(socialAccountId, { source: "external" });
    });

    // Poll-and-recompute when the first pass looks premature:
    //  - syncTriggered=true → Zernio reported a backfill in flight, OR
    //  - zero posts on a platform WITH external history → on a fresh connect
    //    Zernio starts the initial import from the connect itself, NOT from our
    //    analytics read, so it reports syncTriggered=false while the backfill is
    //    still running. "0 posts seconds after connect" therefore usually means
    //    "not imported yet", not "never posted" — wait for posts to appear.
    // We probe every PROBE_INTERVAL with a lightweight check (no Claude
    // inference, no DB write) and stop as soon as the data looks settled —
    // capped at MAX_PROBES (≈60s) so there's no infinite loop. Skipped if the
    // first pass returned null (account deleted).
    const syncInFlight = insights?.meta.syncTriggered === true;
    const emptyFirstPass =
      insights !== null &&
      insights.meta.postsAnalyzed === 0 &&
      insights.meta.dataQuality !== "platform_no_history";

    if (insights !== null && (syncInFlight || emptyFirstPass)) {
      const baselinePostCount = insights.meta.postsAnalyzed;
      console.log(
        `[analyze-account] ⏳ ${syncInFlight ? "syncTriggered=true" : "empty first pass (backfill likely still importing)"} — polling Zernio backfill (interval=${PROBE_INTERVAL}, max=${MAX_PROBES}, baselinePosts=${baselinePostCount}, socialAccountId=${socialAccountId})`
      );

      for (let i = 0; i < MAX_PROBES; i++) {
        await step.sleep(`wait-for-sync-${i}`, PROBE_INTERVAL);

        const probe = await step.run(`probe-sync-${i}`, async () => {
          return probeSyncStatus(socialAccountId);
        });

        const waited = (i + 1) * PROBE_INTERVAL_SECONDS;

        // Only trust a cleared sync flag when the flag is what sent us here —
        // on an empty first pass it was false the whole time, so the only real
        // signals are posts appearing (or the cap).
        if (syncInFlight && !probe.syncTriggered) {
          console.log(
            `[analyze-account] ✓ backfill settled after ~${waited}s (syncTriggered=false, postCount=${probe.postCount}) — recomputing`
          );
          break;
        }
        if (probe.postCount >= RICH_THRESHOLD) {
          console.log(
            `[analyze-account] ✓ rich data after ~${waited}s (postCount=${probe.postCount}) — recomputing`
          );
          break;
        }
        if (probe.postCount > baselinePostCount) {
          console.log(
            `[analyze-account] ✓ new data landed after ~${waited}s (postCount ${baselinePostCount}→${probe.postCount}) — recomputing`
          );
          break;
        }
        if (i === MAX_PROBES - 1) {
          console.log(
            `[analyze-account] ⏰ cap reached (~${waited}s) still syncing (postCount=${probe.postCount}) — accepting whatever data we have`
          );
        } else {
          console.log(
            `[analyze-account] … still waiting after ~${waited}s (syncTriggered=${probe.syncTriggered}, postCount=${probe.postCount})`
          );
        }
      }

      const refreshed = await step.run("compute-insights-after-sync", async () => {
        return computeInsights(socialAccountId, { source: "external" });
      });

      if (refreshed !== null) insights = refreshed;
    }

    // Always flip to "completed" — markAnalysisCompleted is a no-op when the
    // row has been deleted, and unconditionally clearing the flag prevents the
    // dashboard from sticking on "analyzing" if computeInsights ever returns
    // null for a reason other than account-not-found.
    await step.run("mark-analysis-completed", async () => {
      await markAnalysisCompleted(socialAccountId);
    });

    // Strategy is derived from the just-saved insights. Skip when the first
    // pass returned null (account deleted) — there's nothing to build from.
    // computeStrategy THROWS on a model failure (it returns null only for
    // legitimate skips: deleted account / unsupported platform / no KB), so a
    // failed generation re-runs via Inngest's step retries. Runs after the
    // completion flip, so even an exhausted retry leaves analysisStatus intact.
    if (insights !== null) {
      await step.run("compute-strategy", async () => {
        await computeStrategy(socialAccountId);
        return null;
      });
    }

    return {
      success: true,
      socialAccountId,
      ...(insights === null ? { skipped: "account-not-found" } : {}),
    };
  }
);

// Refreshes insights only — never regenerates suggestions. Fired on reconnect
// (accounts.ts) and by the backfill-insights script. Suggestions are only ever
// (re)generated when the user explicitly asks ("Get ideas" or from a brief).
export const refreshInsights = inngest.createFunction(
  { id: "refresh-insights", retries: 2, triggers: [{ event: "account/refresh-insights" }] },
  async ({ event, step }) => {
    const { socialAccountId } = event.data as { socialAccountId: string };

    const insights = await step.run("compute-insights", async () => {
      return computeInsights(socialAccountId, { source: "all" });
    });

    // Idempotent: no-op for "completed" accounts, upgrades "pending" accounts
    // (e.g. backfill-insights script) to "completed".
    await step.run("mark-analysis-completed", async () => {
      await markAnalysisCompleted(socialAccountId);
    });

    // Refresh the strategy off the new insights. Throws on a model failure so
    // Inngest retries the step (same as connect).
    if (insights !== null) {
      await step.run("compute-strategy", async () => {
        await computeStrategy(socialAccountId);
        return null;
      });
    }

    return { success: true, socialAccountId };
  }
);
