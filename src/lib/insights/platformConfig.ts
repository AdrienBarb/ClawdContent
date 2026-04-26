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
