import { inngest } from "../client";
import { prisma } from "@/lib/db/prisma";
import { computeInsights } from "@/lib/services/accountInsights";
import { generateSuggestions } from "@/lib/services/postSuggestions";

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

    // Account no longer exists (deleted between event firing and processing).
    if (insights === null) {
      return { success: true, socialAccountId, skipped: "account-not-found" };
    }

    // If Zernio kicked off a sync, wait once and recompute on the better data.
    // We do NOT recurse on syncTriggered — at most one retry, then we accept
    // whatever data we have (no infinite loop).
    if (insights.meta.syncTriggered) {
      console.log(
        `[analyze-account] ⏳ syncTriggered=true, waiting 60s for Zernio backfill (socialAccountId=${socialAccountId})`
      );
      await step.sleep("wait-for-sync", "60s");

      const refreshed = await step.run("compute-insights-after-sync", async () => {
        return computeInsights(socialAccountId, { source: "external" });
      });

      if (refreshed === null) {
        return { success: true, socialAccountId, skipped: "account-not-found" };
      }
      insights = refreshed;
    }

    // Generate suggestions ONCE, on the best data we have. The user only ever
    // sees one batch from this flow — no silent rugpull mid-session.
    await step.run("generate-suggestions", async () => {
      return generateSuggestions(socialAccountId);
    });

    await step.run("mark-analysis-completed", async () => {
      await markAnalysisCompleted(socialAccountId);
    });

    return { success: true, socialAccountId };
  }
);

// Refreshes insights only — never regenerates suggestions. Fired on reconnect
// (accounts.ts) and by the backfill-insights script. Suggestions are only ever
// (re)generated when the user explicitly asks (first connect, or "Get ideas").
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
