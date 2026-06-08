-- Rename Media.cloudinaryId -> Media.storagePath (Cloudinary -> Supabase Storage migration)
ALTER TABLE "media" RENAME COLUMN "cloudinaryId" TO "storagePath";
ALTER INDEX "media_cloudinaryId_key" RENAME TO "media_storagePath_key";
