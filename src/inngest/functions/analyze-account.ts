import { inngest } from "../client";
import { prisma } from "@/lib/db/prisma";
import { computeInsights } from "@/lib/services/accountInsights";
import { defineStrategyForAccount } from "@/lib/services/strategy";

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

    // If Zernio kicked off a sync, wait once and recompute on the better data.
    // We do NOT recurse on syncTriggered — at most one retry, then we accept
    // whatever data we have (no infinite loop). Skipped if the first pass
    // returned null (account deleted between event and processing).
    if (insights?.meta.syncTriggered) {
      console.log(
        `[analyze-account] ⏳ syncTriggered=true, waiting 60s for Zernio backfill (socialAccountId=${socialAccountId})`
      );
      await step.sleep("wait-for-sync", "60s");

      const refreshed = await step.run("compute-insights-after-sync", async () => {
        return computeInsights(socialAccountId, { source: "external" });
      });

      if (refreshed !== null) insights = refreshed;
    }

    // Generate the per-account strategy using the just-saved insights as the
    // engagement signal. Runs BEFORE mark-analysis-completed so the dashboard
    // never sees `analysisStatus: completed` with `strategy: null` — that
    // would mislead any consumer that gates on completion (weekly cron,
    // post generation). No try/catch here: Inngest retries the step on its
    // own (function-level retries: 3), and we'd rather see a failure than
    // silently ship a user with no strategy.
    const strategyDefined = await step.run("define-strategy", async () => {
      const strategy = await defineStrategyForAccount(socialAccountId);
      return strategy !== null;
    });

    // Flip to "completed" last. markAnalysisCompleted is a no-op when the
    // row has been deleted; unconditionally clearing the flag prevents the
    // dashboard from sticking on "analyzing" if computeInsights or strategy
    // returned null without throwing.
    await step.run("mark-analysis-completed", async () => {
      await markAnalysisCompleted(socialAccountId);
    });

    // Kick off the first week of posts immediately so a user who connects
    // mid-week doesn't have to wait until Sunday 18:00 UTC for the cron.
    // Skipped when no strategy was produced (e.g. video-only platforms in v1
    // where DEFAULT_CADENCE returns null and generationEnabled flips off).
    if (strategyDefined) {
      const ownerUserId = await step.run("resolve-owner", async () => {
        const row = await prisma.socialAccount.findUnique({
          where: { id: socialAccountId },
          select: { lateProfile: { select: { userId: true } } },
        });
        return row?.lateProfile.userId ?? null;
      });
      if (ownerUserId !== null) {
        await step.sendEvent("trigger-first-week", {
          name: "account/generate-week",
          data: { socialAccountId, userId: ownerUserId },
        });
      }
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

    await step.run("compute-insights", async () => {
      return computeInsights(socialAccountId, { source: "all" });
    });

    // Idempotent: no-op for "completed" accounts, upgrades "pending" accounts
    // (e.g. backfill-insights script) to "completed".
    await step.run("mark-analysis-completed", async () => {
      await markAnalysisCompleted(socialAccountId);
    });

    return { success: true, socialAccountId };
  }
);
