-- Add new onboarding columns
ALTER TABLE "user" ADD COLUMN "websiteUrl" TEXT;
ALTER TABLE "user" ADD COLUMN "businessDescription" TEXT;
ALTER TABLE "user" ADD COLUMN "knowledgeBase" JSONB;

-- Backfill existing users who completed old onboarding
UPDATE "user" SET "knowledgeBase" = '{"source": "legacy"}' WHERE "onboardingCompleted" = true;

-- Drop old onboarding columns
ALTER TABLE "user" DROP COLUMN "onboardingCompleted";
ALTER TABLE "user" DROP COLUMN "onboardingRole";
ALTER TABLE "user" DROP COLUMN "onboardingNiche";
ALTER TABLE "user" DROP COLUMN "onboardingTopics";
ALTER TABLE "user" DROP COLUMN "chatSuggestions";
ALTER TABLE "user" DROP COLUMN "onboardingGoal";
