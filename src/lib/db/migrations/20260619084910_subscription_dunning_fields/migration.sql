-- AlterTable
ALTER TABLE "subscription" ADD COLUMN     "dunningStage" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pastDueSince" TIMESTAMP(3);
