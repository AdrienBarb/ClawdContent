-- AlterTable
ALTER TABLE "social_account" ADD COLUMN     "analysisStatus" TEXT NOT NULL DEFAULT 'pending';

-- CreateTable
CREATE TABLE "post_suggestion" (
    "id" TEXT NOT NULL,
    "socialAccountId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "suggestedDay" INTEGER NOT NULL,
    "suggestedHour" INTEGER NOT NULL,
    "reasoning" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_suggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "post_suggestion_socialAccountId_idx" ON "post_suggestion"("socialAccountId");

-- AddForeignKey
ALTER TABLE "post_suggestion" ADD CONSTRAINT "post_suggestion_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "social_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
