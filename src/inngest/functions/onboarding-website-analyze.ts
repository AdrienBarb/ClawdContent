import { inngest } from "../client";
import { prisma } from "@/lib/db/prisma";
import {
  scrapeAndExtractKnowledgeBase,
  extractKnowledgeBaseFromDescription,
} from "@/lib/services/onboarding";
import type { WebsiteAnalysisState } from "@/lib/schemas/onboarding";

interface AnalyzeEvent {
  data: {
    userId: string;
    websiteUrl?: string;
    businessDescription?: string;
  };
}

/**
 * Land a terminal "failed" WITHOUT demoting a "done" — a superseding retry (or a
 * race) may have already written the good result, and the stated invariant is
 * that a completed analysis is never overwritten by a late failure. The JSON
 * path filter makes the guard atomic (mirrors the guarded transition the
 * autopilot batch uses for the same reason).
 */
async function writeFailed(
  userId: string,
  errorCode: WebsiteAnalysisState["errorCode"]
): Promise<void> {
  const failed: WebsiteAnalysisState = { status: "failed", errorCode };
  await prisma.user.updateMany({
    where: {
      id: userId,
      NOT: { websiteAnalysis: { path: ["status"], equals: "done" } },
    },
    data: { websiteAnalysis: failed },
  });
}

/**
 * Background business analysis for onboarding screen 1. The user submits either
 * a website URL or a business description and immediately advances to screen 2
 * (connect socials) while this runs; screen 4 polls `User.websiteAnalysis` until
 * it flips to `done` / `failed`.
 *
 * Fired by `POST /api/onboarding/start` — never awaited in a request.
 *
 * The status ALWAYS reaches a terminal state: a transient scrape failure throws
 * to consume the retry budget, and `onFailure` writes `failed` if those retries
 * are exhausted — so screen 4 never has to guess that a job died. A new event
 * for the same user (e.g. screen-4 "Try again") cancels the in-flight run via
 * `cancelOn`, so retries supersede rather than race the prior attempt.
 */
export const onboardingWebsiteAnalyze = inngest.createFunction(
  {
    id: "onboarding-website-analyze",
    retries: 2,
    cancelOn: [
      {
        event: "onboarding/website-analyze",
        if: "async.data.userId == event.data.userId",
      },
    ],
    // Exhausted retries (or a thrown transient failure that never recovered)
    // would otherwise leave `websiteAnalysis` stuck on "running" forever. Land
    // it on a terminal "failed" so the client renders a definite state.
    onFailure: async ({ event }) => {
      const { userId } = (event.data.event as unknown as AnalyzeEvent).data;
      if (!userId) return;
      await writeFailed(userId, "job_failed");
    },
    triggers: [{ event: "onboarding/website-analyze" }],
  },
  async ({ event, step }) => {
    const { userId, websiteUrl, businessDescription } =
      event.data as AnalyzeEvent["data"];

    await step.run("mark-running", async () => {
      const running: WebsiteAnalysisState = { status: "running" };
      await prisma.user.update({
        where: { id: userId },
        data: { websiteAnalysis: running },
      });
    });

    const result = await step.run("scrape-extract", async () => {
      // Exactly one of the two is set (enforced by onboardingStartSchema). The
      // website path scrapes + extracts; the description path extracts from text.
      // A malformed event with neither fails cleanly rather than extracting from
      // an empty string (which would save a hallucinated KB as "done").
      const r = websiteUrl
        ? await scrapeAndExtractKnowledgeBase(websiteUrl)
        : businessDescription
          ? await extractKnowledgeBaseFromDescription(businessDescription)
          : ({ success: false, errorCode: "extraction_failed" } as const);

      // A transient scrape failure ("unreachable") throws so THIS step re-runs
      // under the retry budget — re-scraping the site. (Throwing after the step
      // returns would only replay the memoized failure, never re-scrape.) On
      // exhausted retries the function fails and `onFailure` lands "failed".
      // Deterministic failures (bad extraction / malformed event) return a value
      // so they save "failed" immediately — retrying them is pointless.
      if (!r.success && r.errorCode === "unreachable") {
        throw new Error(`scrape unreachable for ${websiteUrl}`);
      }
      return r;
    });

    await step.run("save-result", async () => {
      if (result.success) {
        const done: WebsiteAnalysisState = {
          status: "done",
          draft: result.knowledgeBase,
        };
        await prisma.user.update({
          where: { id: userId },
          data: { websiteAnalysis: done },
        });
        return;
      }
      await writeFailed(userId, result.errorCode);
    });

    return { success: result.success, userId };
  }
);
