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
   * - "video"          → only video posts are allowed (TikTok, YouTube)
   * - "image_or_video" → image or video required (Instagram feed, Pinterest)
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
  facebook: {
    platform: "facebook",
    displayName: "Facebook",
    primaryMetric: "likes",
    supportsAnalytics: true,
    noExternalHistory: false,
    defaultBestTimes: [
      { dayOfWeek: 2, hour: 13 }, // Wed 13h
      { dayOfWeek: 3, hour: 19 }, // Thu 19h
      { dayOfWeek: 6, hour: 11 }, // Sun 11h
    ],
    charLimit: null,
    recommendedPostsPerDay: 2,
    requiresMedia: null,
    mediaRules: { maxImages: 10, maxVideos: 1 },
  },
  twitter: {
    platform: "twitter",
    displayName: "X (Twitter)",
    primaryMetric: "likes",
    supportsAnalytics: true,
    noExternalHistory: false,
    defaultBestTimes: [
      { dayOfWeek: 0, hour: 9 },
      { dayOfWeek: 2, hour: 12 },
      { dayOfWeek: 4, hour: 17 },
    ],
    charLimit: 280,
    recommendedPostsPerDay: 4,
    requiresMedia: null,
    mediaRules: { maxImages: 4, maxVideos: 1 },
  },
  threads: {
    platform: "threads",
    displayName: "Threads",
    primaryMetric: "likes",
    supportsAnalytics: true,
    noExternalHistory: false,
    defaultBestTimes: [
      { dayOfWeek: 0, hour: 9 },
      { dayOfWeek: 2, hour: 18 },
      { dayOfWeek: 4, hour: 12 },
    ],
    charLimit: 500,
    recommendedPostsPerDay: 3,
    requiresMedia: null,
    mediaRules: { maxImages: 10, maxVideos: 1 },
  },
  tiktok: {
    platform: "tiktok",
    displayName: "TikTok",
    primaryMetric: "views",
    supportsAnalytics: true,
    noExternalHistory: false,
    defaultBestTimes: [
      { dayOfWeek: 1, hour: 19 },
      { dayOfWeek: 3, hour: 21 },
      { dayOfWeek: 6, hour: 16 },
    ],
    charLimit: 2200,
    recommendedPostsPerDay: 2,
    requiresMedia: "video",
    mediaRules: { maxImages: 35, maxVideos: 1 },
  },
  youtube: {
    platform: "youtube",
    displayName: "YouTube",
    primaryMetric: "views",
    supportsAnalytics: true,
    noExternalHistory: false,
    defaultBestTimes: [
      { dayOfWeek: 4, hour: 15 },
      { dayOfWeek: 5, hour: 10 },
      { dayOfWeek: 6, hour: 14 },
    ],
    charLimit: null,
    recommendedPostsPerDay: 1,
    requiresMedia: "video",
    mediaRules: { maxImages: 0, maxVideos: 1 },
  },
  pinterest: {
    platform: "pinterest",
    displayName: "Pinterest",
    primaryMetric: "saves",
    supportsAnalytics: true,
    noExternalHistory: false,
    defaultBestTimes: [
      { dayOfWeek: 5, hour: 20 },
      { dayOfWeek: 6, hour: 21 },
      { dayOfWeek: 4, hour: 14 },
    ],
    charLimit: 500,
    recommendedPostsPerDay: 4,
    requiresMedia: "image_or_video",
    mediaRules: { maxImages: 1, maxVideos: 1 },
  },
  linkedin: {
    platform: "linkedin",
    displayName: "LinkedIn",
    primaryMetric: "likes",
    supportsAnalytics: true,
    noExternalHistory: true, // personal accounts: pre-Zernio posts invisible. Posts via PostClaw still returned with source=all
    defaultBestTimes: [
      { dayOfWeek: 1, hour: 8 },
      { dayOfWeek: 2, hour: 10 },
      { dayOfWeek: 3, hour: 9 },
    ],
    charLimit: 3000,
    recommendedPostsPerDay: 1,
    requiresMedia: null,
    mediaRules: { maxImages: 20, maxVideos: 1 },
  },
  bluesky: {
    platform: "bluesky",
    displayName: "Bluesky",
    primaryMetric: "likes",
    supportsAnalytics: false,
    noExternalHistory: true,
    defaultBestTimes: [
      { dayOfWeek: 0, hour: 12 },
      { dayOfWeek: 2, hour: 18 },
      { dayOfWeek: 4, hour: 9 },
    ],
    charLimit: 300,
    recommendedPostsPerDay: 3,
    requiresMedia: null,
    mediaRules: { maxImages: 4, maxVideos: 1 },
  },
};

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
