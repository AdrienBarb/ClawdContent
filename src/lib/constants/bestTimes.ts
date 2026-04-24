export interface BestTime {
  dayOfWeek: number; // 0=Monday, 6=Sunday (matches Zernio)
  hour: number; // 0-23, local time
  avgEngagement: number;
  source: "zernio" | "default";
}

// Default best posting times per platform (in local hours).
// Based on industry research. Converted to UTC at scheduling time using user.timezone.
export const DEFAULT_BEST_TIMES: Record<string, BestTime[]> = {
  instagram: [
    { dayOfWeek: 0, hour: 11, avgEngagement: 0, source: "default" }, // Monday 11am
    { dayOfWeek: 1, hour: 10, avgEngagement: 0, source: "default" }, // Tuesday 10am
    { dayOfWeek: 2, hour: 11, avgEngagement: 0, source: "default" }, // Wednesday 11am
    { dayOfWeek: 3, hour: 14, avgEngagement: 0, source: "default" }, // Thursday 2pm
    { dayOfWeek: 4, hour: 10, avgEngagement: 0, source: "default" }, // Friday 10am
  ],
  facebook: [
    { dayOfWeek: 0, hour: 10, avgEngagement: 0, source: "default" },
    { dayOfWeek: 1, hour: 9, avgEngagement: 0, source: "default" },
    { dayOfWeek: 2, hour: 12, avgEngagement: 0, source: "default" },
    { dayOfWeek: 3, hour: 10, avgEngagement: 0, source: "default" },
    { dayOfWeek: 4, hour: 11, avgEngagement: 0, source: "default" },
  ],
  twitter: [
    { dayOfWeek: 0, hour: 9, avgEngagement: 0, source: "default" },
    { dayOfWeek: 1, hour: 10, avgEngagement: 0, source: "default" },
    { dayOfWeek: 2, hour: 12, avgEngagement: 0, source: "default" },
    { dayOfWeek: 3, hour: 9, avgEngagement: 0, source: "default" },
    { dayOfWeek: 4, hour: 11, avgEngagement: 0, source: "default" },
  ],
  linkedin: [
    { dayOfWeek: 0, hour: 8, avgEngagement: 0, source: "default" },
    { dayOfWeek: 1, hour: 10, avgEngagement: 0, source: "default" },
    { dayOfWeek: 2, hour: 9, avgEngagement: 0, source: "default" },
    { dayOfWeek: 3, hour: 8, avgEngagement: 0, source: "default" },
    { dayOfWeek: 4, hour: 10, avgEngagement: 0, source: "default" },
  ],
  tiktok: [
    { dayOfWeek: 0, hour: 12, avgEngagement: 0, source: "default" },
    { dayOfWeek: 1, hour: 15, avgEngagement: 0, source: "default" },
    { dayOfWeek: 2, hour: 19, avgEngagement: 0, source: "default" },
    { dayOfWeek: 3, hour: 12, avgEngagement: 0, source: "default" },
    { dayOfWeek: 4, hour: 17, avgEngagement: 0, source: "default" },
  ],
  threads: [
    { dayOfWeek: 0, hour: 11, avgEngagement: 0, source: "default" },
    { dayOfWeek: 1, hour: 10, avgEngagement: 0, source: "default" },
    { dayOfWeek: 2, hour: 12, avgEngagement: 0, source: "default" },
    { dayOfWeek: 3, hour: 14, avgEngagement: 0, source: "default" },
    { dayOfWeek: 4, hour: 10, avgEngagement: 0, source: "default" },
  ],
  youtube: [
    { dayOfWeek: 0, hour: 14, avgEngagement: 0, source: "default" },
    { dayOfWeek: 2, hour: 15, avgEngagement: 0, source: "default" },
    { dayOfWeek: 3, hour: 14, avgEngagement: 0, source: "default" },
    { dayOfWeek: 4, hour: 16, avgEngagement: 0, source: "default" },
    { dayOfWeek: 5, hour: 12, avgEngagement: 0, source: "default" }, // Saturday
  ],
  pinterest: [
    { dayOfWeek: 0, hour: 20, avgEngagement: 0, source: "default" },
    { dayOfWeek: 1, hour: 20, avgEngagement: 0, source: "default" },
    { dayOfWeek: 2, hour: 21, avgEngagement: 0, source: "default" },
    { dayOfWeek: 4, hour: 20, avgEngagement: 0, source: "default" },
    { dayOfWeek: 5, hour: 14, avgEngagement: 0, source: "default" },
  ],
  bluesky: [
    { dayOfWeek: 0, hour: 9, avgEngagement: 0, source: "default" },
    { dayOfWeek: 1, hour: 10, avgEngagement: 0, source: "default" },
    { dayOfWeek: 2, hour: 12, avgEngagement: 0, source: "default" },
    { dayOfWeek: 3, hour: 9, avgEngagement: 0, source: "default" },
    { dayOfWeek: 4, hour: 11, avgEngagement: 0, source: "default" },
  ],
};
