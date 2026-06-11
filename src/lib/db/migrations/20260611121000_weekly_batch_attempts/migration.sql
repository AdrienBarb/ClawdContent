-- Track generation attempts so the hourly dispatch can re-try a failed batch (max 3).
ALTER TABLE "weekly_batch" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;
