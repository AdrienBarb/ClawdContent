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

    const insights = await step.run("compute-insights", async () => {
      return computeInsights(socialAccountId, { source: "external" });
    });

    // Account no longer exists (deleted between event firing and processing) — exit cleanly.
    if (insights === null) {
      return { success: true, socialAccountId, skipped: "account-not-found" };
    }

    await step.run("generate-suggestions", async () => {
      return generateSuggestions(socialAccountId);
    });

    // Flip status only after suggestions exist, so the dashboard loader doesn't
    // briefly show the empty state while suggestions are still being generated.
    await step.run("mark-analysis-completed", async () => {
      await markAnalysisCompleted(socialAccountId);
    });

    if (insights.meta.syncTriggered) {
      console.log(
        `[analyze-account] ⏳ syncTriggered=true, scheduling re-analysis in 60s for ${socialAccountId}`
      );
      await step.sleep("wait-for-sync", "60s");

      await step.run("retry-after-sync", async () => {
        await computeInsights(socialAccountId, { source: "external" });
        await generateSuggestions(socialAccountId);
      });
    }

    return { success: true, socialAccountId };
  }
);

export const refreshInsights = inngest.createFunction(
  { id: "refresh-insights", retries: 2, triggers: [{ event: "account/refresh-insights" }] },
  async ({ event, step }) => {
    const { socialAccountId } = event.data as { socialAccountId: string };

    await step.run("compute-insights", async () => {
      return computeInsights(socialAccountId, { source: "all" });
    });

    await step.run("generate-suggestions", async () => {
      return generateSuggestions(socialAccountId);
    });

    // Idempotent: no-op for accounts already "completed", upgrades "pending"
    // accounts (e.g. backfill-insights script) to "completed".
    await step.run("mark-analysis-completed", async () => {
      await markAnalysisCompleted(socialAccountId);
    });

    return { success: true, socialAccountId };
  }
);
