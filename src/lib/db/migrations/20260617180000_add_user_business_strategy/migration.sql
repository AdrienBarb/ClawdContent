-- AlterTable: store the brand-level "business" growth strategy on the user.
-- Built early in onboarding from knowledgeBase/draft + onboardingGoal alone
-- (NO social data) so the paywall reveal is instant. JSON (no enum) to match
-- the codebase convention. Shape validated by
-- `src/lib/schemas/strategy.ts` (businessStrategyStoredSchema). The per-account
-- "strategy" column stays background-only (autopilot/analyze-account).
ALTER TABLE "user" ADD COLUMN "businessStrategy" JSONB;
