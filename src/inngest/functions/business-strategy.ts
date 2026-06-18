import { inngest } from "../client";
import { computeBusinessStrategy } from "@/lib/services/socialStrategy";

/**
 * Brand-level business strategy generation. Fired from `saveOnboardingProgress`
 * the moment the goal lands (step 3, built from the website-analysis draft) and
 * again when the business facts are confirmed/edited (step 4, built from the
 * confirmed knowledgeBase) — so it's ready well before the paywall (step 6),
 * which reads `User.businessStrategy` with zero social-analysis wait.
 *
 * `computeBusinessStrategy` is social-independent (no insights, no platform), so
 * it NEVER waits on the slow Zernio backfill that gates `analyze-account`. It's
 * idempotent and the event carries only the userId, so a draft fire that lands
 * after the confirmed fire can't downgrade the row (kbSource monotonic guard in
 * `computeBusinessStrategy`).
 *
 * Durable on purpose (Inngest, not Vercel `after()`): a dropped generation must
 * retry rather than leave the paywall stuck building.
 */
export const generateBusinessStrategy = inngest.createFunction(
  {
    id: "generate-business-strategy",
    retries: 2,
    triggers: [{ event: "business-strategy/generate" }],
  },
  async ({ event, step }) => {
    const { userId } = event.data as { userId: string };

    await step.run("compute-business-strategy", async () => {
      await computeBusinessStrategy(userId);
      return null;
    });

    return { success: true, userId };
  }
);
