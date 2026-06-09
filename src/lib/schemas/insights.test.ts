import { describe, it, expect } from "vitest";
import { insightsV2Schema } from "@/lib/schemas/insights";

/**
 * A v2 insights blob as written BEFORE this change: topPost metrics have no
 * `clicks` / watch-time fields and the `zernio` zone has no `bottomPosts`.
 * Existing users' stored JSON looks exactly like this — it must keep parsing.
 */
const legacyInsights = {
  meta: {
    version: 2,
    dataQuality: "rich",
    analyzedAt: "2026-05-01T00:00:00.000Z",
    postsAnalyzed: 8,
    syncTriggered: false,
    nextRefreshAt: null,
    voiceBorrowedFromPlatform: null,
  },
  zernio: {
    account: {
      followersCount: 63,
      growth30d: 6,
      growth30dPercentage: 10.53,
      displayName: "Acme",
    },
    topPosts: [
      {
        content: "old post",
        mediaType: "image",
        publishedAt: "2026-04-01T00:00:00.000Z",
        metrics: {
          impressions: 530,
          reach: 288,
          likes: 14,
          comments: 3,
          shares: 2,
          saves: 0,
          views: 530,
          engagementRate: 3.58,
        },
      },
    ],
    // NOTE: no `bottomPosts`
    bestTimes: null,
    postingFrequency: null,
  },
  computed: {
    primaryMetric: "likes",
    avgPrimaryMetric: 14,
    contentMix: [{ type: "image", percentage: 100 }],
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
  inferred: null,
};

describe("insightsV2Schema backward compatibility", () => {
  it("parses legacy insights and back-fills new metric fields with 0", () => {
    const parsed = insightsV2Schema.parse(legacyInsights);
    const m = parsed.zernio.topPosts[0].metrics;
    expect(m.clicks).toBe(0);
    expect(m.igReelsAvgWatchTime).toBe(0);
    expect(m.igReelsVideoViewTotalTime).toBe(0);
  });

  it("defaults missing bottomPosts to an empty array", () => {
    const parsed = insightsV2Schema.parse(legacyInsights);
    expect(parsed.zernio.bottomPosts).toEqual([]);
  });

  it("defaults missing computed.avgEngagementRate to null", () => {
    const parsed = insightsV2Schema.parse(legacyInsights);
    expect(parsed.computed.avgEngagementRate).toBeNull();
  });

  it("still round-trips a freshly-written blob with all new fields present", () => {
    const fresh = structuredClone(legacyInsights) as Record<string, unknown>;
    const zernio = fresh.zernio as Record<string, unknown>;
    (zernio.topPosts as Array<{ metrics: Record<string, number> }>)[0].metrics = {
      impressions: 1,
      reach: 1,
      likes: 1,
      comments: 0,
      shares: 0,
      saves: 0,
      clicks: 2,
      views: 1,
      igReelsAvgWatchTime: 7.4,
      igReelsVideoViewTotalTime: 100,
      engagementRate: 5,
    };
    zernio.bottomPosts = [];
    const parsed = insightsV2Schema.parse(fresh);
    expect(parsed.zernio.topPosts[0].metrics.clicks).toBe(2);
    expect(parsed.zernio.topPosts[0].metrics.igReelsAvgWatchTime).toBe(7.4);
  });
});
