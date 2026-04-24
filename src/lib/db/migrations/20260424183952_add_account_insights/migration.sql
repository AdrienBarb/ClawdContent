-- AlterTable
ALTER TABLE "social_account" ADD COLUMN     "bestTimes" JSONB,
ADD COLUMN     "insights" JSONB,
ADD COLUMN     "lastAnalyzedAt" TIMESTAMP(3);
