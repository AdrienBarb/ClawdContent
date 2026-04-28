-- Defense against double-post when Zernio returns OK but the local cleanup
-- transaction fails (transient DB blip / deadlock). The route writes
-- `publishingStartedAt` before Zernio, then `publishedExternalId` after.
-- A retry sees `publishedExternalId` and skips the second Zernio call.
ALTER TABLE "post_suggestion"
  ADD COLUMN IF NOT EXISTS "publishingStartedAt" TIMESTAMP(3);

ALTER TABLE "post_suggestion"
  ADD COLUMN IF NOT EXISTS "publishedExternalId" TEXT;
