/**
 * Test fixtures shaped from REAL Zernio responses (ground-truthed 2026-06-08,
 * see ~/.claude/output/zernio-real-shapes.md). Not a test file — excluded from
 * the `*.test.ts` glob. Shared by extract / strategy / thin-data tests.
 */
import type { AnalyticsPost } from "@/lib/late/mutations";
import type { Insights, DataQuality } from "@/lib/schemas/insights";

type AnalyticsOverrides = Partial<AnalyticsPost["analytics"]>;

export function makeAnalyticsPost(
  overrides: Partial<Omit<AnalyticsPost, "analytics">> & { analytics?: AnalyticsOverrides } = {}
): AnalyticsPost {
  const { analytics, ...rest } = overrides;
  return {
    _id: "post-default",
    latePostId: null,
    content: "Default content",
    publishedAt: "2026-05-01T10:00:00.000Z",
    status: "published",
    platform: "instagram",
    platformPostUrl: null,
    isExternal: true,
    mediaType: "image",
    thumbnailUrl: null,
    ...rest,
    analytics: {
      impressions: 0,
      reach: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      clicks: 0,
      views: 0,
      igReelsAvgWatchTime: 0,
      igReelsVideoViewTotalTime: 0,
      engagementRate: 0,
      ...analytics,
    },
  };
}

/** The exact IG top post from the live probe (caption redacted to its length). */
export const realIgPost = makeAnalyticsPost({
  _id: "ig-1",
  platform: "instagram",
  content: "x".repeat(1427), // real caption was 1427 chars — assert we DON'T truncate
  mediaType: "image",
  analytics: {
    impressions: 530,
    reach: 288,
    likes: 14,
    comments: 3,
    shares: 2,
    saves: 0,
    clicks: 0,
    views: 530,
    engagementRate: 3.58,
  },
});

/** The exact FB top post from the live probe — note reach:2 and clicks present. */
export const realFbPost = makeAnalyticsPost({
  _id: "fb-1",
  platform: "facebook",
  content: "y".repeat(876),
  mediaType: "image",
  analytics: {
    impressions: 4,
    reach: 2,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    clicks: 0,
    views: 4,
    engagementRate: 0,
  },
});

interface InsightsOverrides {
  dataQuality?: DataQuality;
  postsAnalyzed?: number;
  platform?: string;
  bestTimes?: Insights["zernio"]["bestTimes"];
  postingFrequency?: Insights["zernio"]["postingFrequency"];
  topPosts?: Insights["zernio"]["topPosts"];
  bottomPosts?: Insights["zernio"]["bottomPosts"];
  inferred?: Insights["inferred"];
  contentMix?: Insights["computed"]["contentMix"];
  avgEngagementRate?: number | null;
}

/**
 * Build a minimal but schema-valid `Insights` object for resolver/strategy
 * tests. Only the fields a test cares about need overriding.
 */
export function makeInsights(o: InsightsOverrides = {}): Insights {
  const postsAnalyzed = o.postsAnalyzed ?? 8;
  return {
    meta: {
      version: 2,
      dataQuality: o.dataQuality ?? "rich",
      analyzedAt: "2026-05-01T00:00:00.000Z",
      postsAnalyzed,
      syncTriggered: false,
      nextRefreshAt: null,
      voiceBorrowedFromPlatform: null,
    },
    zernio: {
      account: {
        followersCount: 63,
        growth30d: 6,
        growth30dPercentage: 10.53,
        displayName: "Acme Studio",
      },
      topPosts: o.topPosts ?? [],
      bottomPosts: o.bottomPosts ?? [],
      bestTimes: o.bestTimes ?? null,
      postingFrequency: o.postingFrequency ?? null,
    },
    computed: {
      primaryMetric: "likes",
      avgPrimaryMetric: 14,
      avgEngagementRate: o.avgEngagementRate ?? null,
      contentMix: o.contentMix ?? [{ type: "image", percentage: 100 }],
      extractedHashtags: [],
      voiceStats: {
        avgPostLengthChars: 200,
        avgSentenceLength: 20,
        emojiDensity: 0.5,
        hashtagsPerPost: 2,
        questionFrequency: 0.3,
        linkFrequency: 0,
      },
    },
    inferred: o.inferred ?? null,
  };
}

/** A real-shaped Reel with non-zero watch time (the IG #1 signal). */
export const realIgReel = makeAnalyticsPost({
  _id: "ig-reel-1",
  platform: "instagram",
  content: "Reel caption",
  mediaType: "video",
  analytics: {
    impressions: 2000,
    reach: 1500,
    likes: 80,
    comments: 12,
    shares: 30,
    saves: 25,
    clicks: 4,
    views: 1800,
    igReelsAvgWatchTime: 7.4,
    igReelsVideoViewTotalTime: 13320,
    engagementRate: 7.35,
  },
});
