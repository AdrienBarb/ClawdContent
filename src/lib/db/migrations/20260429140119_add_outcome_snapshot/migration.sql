-- CreateTable
CREATE TABLE "outcome_snapshot" (
    "userId" TEXT NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedCount" INTEGER NOT NULL DEFAULT 0,
    "topPerformers" JSONB NOT NULL,
    "underperformers" JSONB NOT NULL,
    "patterns" JSONB NOT NULL,
    "failedPosts" JSONB NOT NULL,

    CONSTRAINT "outcome_snapshot_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "outcome_snapshot" ADD CONSTRAINT "outcome_snapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
