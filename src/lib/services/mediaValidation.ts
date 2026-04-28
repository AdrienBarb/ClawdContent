import { getPlatformConfig } from "@/lib/insights/platformConfig";
import type { MediaItem } from "@/lib/schemas/mediaItems";

export type MediaValidationResult =
  | { ok: true }
  | { ok: false, error: string };

export function validateMediaItems(
  items: MediaItem[],
  platform: string
): MediaValidationResult {
  const config = getPlatformConfig(platform);
  const { maxImages, maxVideos } = config.mediaRules;
  const label = config.displayName;

  let imageCount = 0;
  let videoCount = 0;
  for (const item of items) {
    if (item.type === "image") imageCount += 1;
    else if (item.type === "video") videoCount += 1;
  }

  // Platforms like TikTok declare maxImages > 0 because the API technically
  // accepts photo carousels, but requiresMedia: "video" means the surface we
  // publish to fails opaquely on images. Block here for a friendly error.
  if (config.requiresMedia === "video" && imageCount > 0) {
    return {
      ok: false,
      error: `${label} only accepts video — replace photos with a video.`,
    };
  }

  if (imageCount > 0 && videoCount > 0) {
    return {
      ok: false,
      error: `${label} doesn't allow mixing photos and video in the same post.`,
    };
  }

  if (imageCount > 0 && maxImages === 0) {
    return {
      ok: false,
      error: `${label} doesn't accept photos here — attach a video instead.`,
    };
  }
  if (videoCount > 0 && maxVideos === 0) {
    return {
      ok: false,
      error: `${label} doesn't accept video here — attach a photo instead.`,
    };
  }

  if (imageCount > maxImages) {
    return {
      ok: false,
      error: `${label} accepts up to ${maxImages} photo${maxImages === 1 ? "" : "s"} per post.`,
    };
  }
  if (videoCount > maxVideos) {
    return {
      ok: false,
      error: `${label} accepts up to ${maxVideos} video${maxVideos === 1 ? "" : "s"} per post.`,
    };
  }

  return { ok: true };
}
