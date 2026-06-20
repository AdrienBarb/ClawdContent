import type { PrimaryMetric } from "@/lib/insights/extract";

export interface BestTimeSlot {
  dayOfWeek: number; // 0=Monday, 6=Sunday
  hour: number; // 0-23 UTC
}

export interface PlatformConfig {
  platform: string;
  displayName: string;
  primaryMetric: PrimaryMetric;
  supportsAnalytics: boolean;
  /**
   * True for platforms whose API doesn't return *external* (pre-Zernio) post history.
   * On `source: "external"` we skip the post fetch entirely (always 0 posts).
   * On `source: "all"` we still fetch — posts published via PostClaw will be returned.
   */
  noExternalHistory: boolean;
  /** Fallback posting times when bestTimes is unavailable (UTC). */
  defaultBestTimes: BestTimeSlot[];
  /** Hard character limit, or null when very long. */
  charLimit: number | null;
  /**
   * How many "Posting Slots" pills to surface in the schedule picker.
   * Aligned with industry recommendations for posts/day on each platform.
   * Capped 1–4 to keep the popover compact.
   */
  recommendedPostsPerDay: number;
  /**
   * Whether the platform refuses (or effectively refuses) text-only posts.
   * - "video"          → only video posts are allowed (YouTube)
   * - "image_or_video" → image or video required (Instagram feed, Pinterest, TikTok)
   * - null             → text posts are fine
   *
   * Used to (a) steer the suggestion prompt and (b) override Claude's
   * contentType server-side if it ever ignores the steer.
   */
  requiresMedia: "video" | "image_or_video" | null;
  /**
   * Per-platform media-attachment limits (verified against Zernio OpenAPI).
   * Universal invariant: a single post never mixes images and videos —
   * platforms accept "carousel of images" OR "single video", never both.
   * `maxImages: 0` means images aren't supported (YouTube).
   */
  mediaRules: {
    maxImages: number;
    maxVideos: number;
  };
}

export const PLATFORM_CONFIG: Record<string, PlatformConfig> = {
  instagram: {
    platform: "instagram",
    displayName: "Instagram",
    primaryMetric: "likes",
    supportsAnalytics: true,
    noExternalHistory: false,
    defaultBestTimes: [
      { dayOfWeek: 1, hour: 18 }, // Tue 18h
      { dayOfWeek: 3, hour: 11 }, // Thu 11h
      { dayOfWeek: 5, hour: 10 }, // Sat 10h
    ],
    charLimit: 2200,
    recommendedPostsPerDay: 2,
    requiresMedia: "image_or_video",
    mediaRules: { maxImages: 10, maxVideos: 1 },
  },
};

/**
 * The only platforms PostClaw supports. Single source of truth — every UI/job
 * boundary filters connected accounts through `isSupportedPlatform` so legacy
 * accounts on now-removed platforms are hidden (never deleted).
 */
export const SUPPORTED_PLATFORMS = Object.keys(PLATFORM_CONFIG);

export function getPlatformConfig(platform: string): PlatformConfig {
  const config = PLATFORM_CONFIG[platform];
  if (!config) {
    throw new Error(
      `Unsupported platform: ${platform}. Expected one of: ${Object.keys(PLATFORM_CONFIG).join(", ")}`
    );
  }
  return config;
}

export function isSupportedPlatform(platform: string): boolean {
  return platform in PLATFORM_CONFIG;
}

export type SuggestionContentType = "text" | "image" | "video" | "carousel";

/**
 * Deterministic contentType from the platform's media rule. The model never
 * picks contentType — it's purely a function of what the platform accepts.
 * Free-choice platforms default to "text"; the user attaches media if they want.
 */
export function defaultContentType(
  requiresMedia: PlatformConfig["requiresMedia"]
): SuggestionContentType {
  if (requiresMedia === "video") return "video";
  if (requiresMedia === "image_or_video") return "image";
  return "text";
}
