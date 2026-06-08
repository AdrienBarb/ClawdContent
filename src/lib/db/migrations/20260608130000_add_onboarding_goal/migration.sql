-- AlterTable: store the user's primary social goal, picked on onboarding step 3.
-- Plain string (no enum) to match the codebase convention. Values:
-- find_customers | build_community | brand_awareness | authority
ALTER TABLE "user" ADD COLUMN "onboardingGoal" TEXT;
