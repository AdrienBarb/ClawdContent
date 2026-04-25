-- AlterTable
ALTER TABLE "social_account" ADD COLUMN     "insights" JSONB,
ADD COLUMN     "lastAnalyzedAt" TIMESTAMP(3);
