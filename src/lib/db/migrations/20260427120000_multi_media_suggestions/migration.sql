-- Add new mediaItems column
ALTER TABLE "post_suggestion" ADD COLUMN "mediaItems" JSONB;

-- Backfill: convert existing single-media rows into a one-element array.
-- mediaType was a free-form string ("image" | "video" | "gif" | "document"),
-- but the new schema enum is "image" | "video". Anything not "video" becomes
-- "image" so legacy GIFs/documents survive (matches Cloudinary's resource_type
-- mapping in useCloudinaryUpload).
UPDATE "post_suggestion"
SET "mediaItems" = jsonb_build_array(
  jsonb_build_object(
    'url', "mediaUrl",
    'type', CASE WHEN "mediaType" = 'video' THEN 'video' ELSE 'image' END
  )
)
WHERE "mediaUrl" IS NOT NULL;

-- Drop legacy single-slot columns
ALTER TABLE "post_suggestion" DROP COLUMN "mediaUrl";
ALTER TABLE "post_suggestion" DROP COLUMN "mediaType";

-- YouTube `requiresMedia` flipped from "image_or_video" to "video" in this
-- release. Any pre-existing YouTube suggestion with a non-video contentType
-- or non-video media is now publish-blocked. Strand them deliberately so the
-- user regenerates rather than getting a confusing Zernio rejection later.
UPDATE "post_suggestion" AS ps
SET "mediaItems" = NULL,
    "contentType" = 'video'
FROM "social_account" AS sa
WHERE ps."socialAccountId" = sa.id
  AND sa.platform = 'youtube'
  AND ps."contentType" != 'video';
