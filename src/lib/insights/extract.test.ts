import { describe, it, expect } from "vitest";
import {
  SUCCESS_METRIC,
  selectTopAndBottomPosts,
  toStoredPost,
  computeAvgEngagementRate,
  postBelongsToAccount,
} from "@/lib/insights/extract";
import {
  makeAnalyticsPost,
  realIgPost,
  realFbPost,
  realIgReel,
} from "@/lib/insights/__fixtures__/zernio";

describe("toStoredPost", () => {
  it("stores the FULL caption — no truncation", () => {
    const stored = toStoredPost(realIgPost);
    expect(stored.content).toHaveLength(1427);
    expect(stored.content).toBe(realIgPost.content);
  });

  it("captures clicks and the Reels watch-time signals", () => {
    const stored = toStoredPost(realIgReel);
    expect(stored.metrics.clicks).toBe(4);
    expect(stored.metrics.igReelsAvgWatchTime).toBe(7.4);
    expect(stored.metrics.igReelsVideoViewTotalTime).toBe(13320);
  });

  it("maps every FB metric including reach and clicks (uniform shape)", () => {
    const stored = toStoredPost(realFbPost);
    expect(stored.metrics).toEqual({
      impressions: 4,
      reach: 2,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      clicks: 0,
      views: 4,
      igReelsAvgWatchTime: 0,
      igReelsVideoViewTotalTime: 0,
      engagementRate: 0,
    });
  });

  it("defends against rows missing the newer fields (defaults to 0)", () => {
    // Simulate an older synced row whose analytics object predates watch-time.
    const legacy = makeAnalyticsPost({ _id: "legacy" });
    // @ts-expect-error — deliberately delete a field the type guarantees
    delete legacy.analytics.igReelsAvgWatchTime;
    // @ts-expect-error — same: simulate an older row without this field
    delete legacy.analytics.clicks;
    const stored = toStoredPost(legacy);
    expect(stored.metrics.igReelsAvgWatchTime).toBe(0);
    expect(stored.metrics.clicks).toBe(0);
  });
});

describe("selectTopAndBottomPosts", () => {
  const er = (id: string, engagementRate: number, impressions = 100) =>
    makeAnalyticsPost({ _id: id, analytics: { engagementRate, impressions } });

  it("ranks top by engagementRate (the success metric)", () => {
    expect(SUCCESS_METRIC).toBe("engagementRate");
    const posts = [er("a", 1), er("b", 9), er("c", 5), er("d", 3), er("e", 7), er("f", 2)];
    const { top } = selectTopAndBottomPosts(posts, 3);
    expect(top.map((p) => p._id)).toEqual(["b", "e", "c"]);
  });

  it("returns a bottom set that is disjoint from top and ordered worst-first", () => {
    const posts = [er("a", 1), er("b", 9), er("c", 5), er("d", 3), er("e", 7), er("f", 2)];
    const { top, bottom } = selectTopAndBottomPosts(posts, 3);
    expect(bottom.map((p) => p._id)).toEqual(["a", "f", "d"]); // 1, 2, 3 ER — worst first
    const overlap = top.filter((t) => bottom.some((b) => b._id === t._id));
    expect(overlap).toHaveLength(0);
  });

  it("produces an EMPTY bottom when there are too few posts (≤ limit)", () => {
    const posts = [er("a", 1), er("b", 9), er("c", 5), er("d", 3)];
    const { top, bottom } = selectTopAndBottomPosts(posts, 5);
    expect(top).toHaveLength(4);
    expect(bottom).toHaveLength(0);
  });

  it("is deterministic on ties (engagementRate → impressions → _id)", () => {
    const posts = [
      er("z", 5, 50),
      er("a", 5, 50), // same ER + impressions as z → _id breaks the tie (a < z)
      er("m", 5, 90), // higher impressions → ranks above the two
    ];
    const { top } = selectTopAndBottomPosts(posts, 3);
    expect(top.map((p) => p._id)).toEqual(["m", "a", "z"]);
  });

  it("handles an empty post list", () => {
    const { top, bottom } = selectTopAndBottomPosts([], 5);
    expect(top).toEqual([]);
    expect(bottom).toEqual([]);
  });
});

describe("computeAvgEngagementRate", () => {
  it("returns null for no posts (so callers can say 'no data', not 0%)", () => {
    expect(computeAvgEngagementRate([])).toBeNull();
  });

  it("averages engagementRate across ALL posts (the honest mean)", () => {
    const posts = [
      makeAnalyticsPost({ _id: "a", analytics: { engagementRate: 6 } }),
      makeAnalyticsPost({ _id: "b", analytics: { engagementRate: 2 } }),
      makeAnalyticsPost({ _id: "c", analytics: { engagementRate: 1 } }),
    ];
    expect(computeAvgEngagementRate(posts)).toBe(3); // (6+2+1)/3
  });
});

describe("postBelongsToAccount", () => {
  it("matches via platforms[].accountId as a string", () => {
    const post = makeAnalyticsPost({ platforms: [{ accountId: "acc-1" }] });
    expect(postBelongsToAccount(post, "acc-1")).toBe(true);
    expect(postBelongsToAccount(post, "acc-2")).toBe(false);
  });

  it("matches via a populated accountId object { _id }", () => {
    const post = makeAnalyticsPost({ platforms: [{ accountId: { _id: "acc-9" } }] });
    expect(postBelongsToAccount(post, "acc-9")).toBe(true);
  });

  it("matches when ANY of several platform targets is the account", () => {
    const post = makeAnalyticsPost({
      platforms: [{ accountId: "other" }, { accountId: "acc-1" }],
    });
    expect(postBelongsToAccount(post, "acc-1")).toBe(true);
  });

  it("returns false when the post carries no platform account id (never misattribute)", () => {
    expect(postBelongsToAccount(makeAnalyticsPost({}), "acc-1")).toBe(false);
    expect(
      postBelongsToAccount(makeAnalyticsPost({ platforms: [{ platform: "instagram" }] }), "acc-1")
    ).toBe(false);
  });
});
