-- AlterTable
ALTER TABLE "user" ADD COLUMN     "onboardingStep" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "onboardingCompletedAt" TIMESTAMP(3),
ADD COLUMN     "websiteAnalysis" JSONB;

-- Backfill: existing users who already have a knowledge base have effectively
-- finished onboarding. Mark them complete so the gate flip (knowledgeBase ->
-- onboardingCompletedAt) does not bounce paying/active users into onboarding.
UPDATE "user"
SET "onboardingCompletedAt" = NOW(),
    "onboardingStep" = 5
WHERE "knowledgeBase" IS NOT NULL;
