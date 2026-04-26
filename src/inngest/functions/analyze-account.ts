import { inngest } from "../client";
import { computeInsights } from "@/lib/services/accountInsights";
import { generateSuggestions } from "@/lib/services/postSuggestions";

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

    return { success: true, socialAccountId };
  }
);
