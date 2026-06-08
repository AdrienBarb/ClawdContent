import { inngest } from "../client";
import { prisma } from "@/lib/db/prisma";
import { scrapeAndExtractKnowledgeBase } from "@/lib/services/onboarding";
import type { WebsiteAnalysisState } from "@/lib/schemas/onboarding";

/**
 * Background website analysis for onboarding screen 1. The user submits their
 * URL and immediately advances to screen 2 (connect socials) while this runs;
 * screen 3 polls `User.websiteAnalysis` until it flips to `done` / `failed`.
 *
 * Fired by `POST /api/onboarding/start` — never awaited in a request.
 */
export const onboardingWebsiteAnalyze = inngest.createFunction(
  {
    id: "onboarding-website-analyze",
    retries: 2,
    triggers: [{ event: "onboarding/website-analyze" }],
  },
  async ({ event, step }) => {
    const { userId, websiteUrl } = event.data as {
      userId: string;
      websiteUrl: string;
    };

    await step.run("mark-running", async () => {
      const running: WebsiteAnalysisState = { status: "running" };
      await prisma.user.update({
        where: { id: userId },
        data: { websiteAnalysis: running },
      });
    });

    const result = await step.run("scrape-extract", async () => {
      return scrapeAndExtractKnowledgeBase(websiteUrl);
    });

    await step.run("save-result", async () => {
      const next: WebsiteAnalysisState = result.success
        ? { status: "done", draft: result.knowledgeBase }
        : { status: "failed", errorCode: result.errorCode };
      await prisma.user.update({
        where: { id: userId },
        data: { websiteAnalysis: next },
      });
    });

    return { success: result.success, userId };
  }
);
