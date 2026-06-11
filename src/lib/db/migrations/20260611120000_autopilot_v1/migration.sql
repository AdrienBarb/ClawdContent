-- Autopilot v1: WeeklyBatch + autopilot fields, drop usage ledger.

-- DropTable (usage ledger removed — flat $99, no credits, no caps)
DROP TABLE IF EXISTS "usage_ledger";

-- AlterTable: user autopilot fields
ALTER TABLE "user" ADD COLUMN "autopilotMode" TEXT NOT NULL DEFAULT 'full_auto';
ALTER TABLE "user" ADD COLUMN "autopilotPausedAt" TIMESTAMP(3);
ALTER TABLE "user" ADD COLUMN "pendingBrief" TEXT;
ALTER TABLE "user" ADD COLUMN "styleKit" JSONB;

-- CreateTable: weekly_batch
CREATE TABLE "weekly_batch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'generating',
    "mode" TEXT NOT NULL DEFAULT 'full_auto',
    "brief" TEXT,
    "posts" JSONB,
    "error" TEXT,
    "digestSentAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weekly_batch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "weekly_batch_userId_weekStart_key" ON "weekly_batch"("userId", "weekStart");
CREATE INDEX "weekly_batch_userId_idx" ON "weekly_batch"("userId");

ALTER TABLE "weekly_batch" ADD CONSTRAINT "weekly_batch_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: post_suggestion batch link + status
ALTER TABLE "post_suggestion" ADD COLUMN "batchId" TEXT;
ALTER TABLE "post_suggestion" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'draft';

CREATE INDEX "post_suggestion_batchId_idx" ON "post_suggestion"("batchId");

ALTER TABLE "post_suggestion" ADD CONSTRAINT "post_suggestion_batchId_fkey"
    FOREIGN KEY ("batchId") REFERENCES "weekly_batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
