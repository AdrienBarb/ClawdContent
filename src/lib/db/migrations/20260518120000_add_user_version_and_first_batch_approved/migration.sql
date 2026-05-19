-- AlterTable
ALTER TABLE "user" ADD COLUMN "version" TEXT NOT NULL DEFAULT 'v1';
ALTER TABLE "user" ADD COLUMN "firstBatchApproved" BOOLEAN NOT NULL DEFAULT true;
