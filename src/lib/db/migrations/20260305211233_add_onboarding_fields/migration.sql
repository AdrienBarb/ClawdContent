-- AlterTable
ALTER TABLE "user" ADD COLUMN     "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "onboardingNiche" TEXT,
ADD COLUMN     "onboardingRole" TEXT,
ADD COLUMN     "onboardingTopics" TEXT[] DEFAULT ARRAY[]::TEXT[];
