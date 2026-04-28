-- PHASE 1 of a two-phase rollout. This migration ONLY adds and backfills the
-- new `mediaItems` column. The legacy `mediaUrl` / `mediaType` columns are
-- left in place so older serverless instances still serving traffic during
-- a Vercel rolling deploy don't 5xx on `SELECT *`-shaped queries.
--
-- Once this branch has been fully deployed and old instances have drained,
-- ship the follow-up migration `_drop_legacy_media_columns` (separate PR /
-- release) to actually drop the columns.

-- Add new mediaItems column
ALTER TABLE "post_suggestion" ADD COLUMN IF NOT EXISTS "mediaItems" JSONB;

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
WHERE "mediaUrl" IS NOT NULL
  AND "mediaItems" IS NULL;

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
