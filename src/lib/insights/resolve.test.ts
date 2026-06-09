import { describe, it, expect } from "vitest";
import { resolveCadence, resolveBestTimes } from "@/lib/insights/resolve";
import { getBestPractices } from "@/lib/insights/bestPractices";
import { makeInsights } from "@/lib/insights/__fixtures__/zernio";

const igKb = getBestPractices("instagram")!;

describe("resolveCadence", () => {
  it("cold-start (0 posts, no frequency) → benchmark, no actual, recommended still present", () => {
    const insights = makeInsights({ dataQuality: "cold_start", postsAnalyzed: 0 });
    const c = resolveCadence(insights, igKb);
    expect(c.actualPostsPerWeek).toBeNull();
    expect(c.source).toBe("benchmark");
    expect(c.recommended).toEqual(igKb.recommendedPostsPerWeek);
  });

  it("works when insights is entirely null", () => {
    const c = resolveCadence(null, igKb);
    expect(c.actualPostsPerWeek).toBeNull();
    expect(c.source).toBe("benchmark");
    expect(c.recommended.min).toBeGreaterThan(0);
  });

  it("thin (2 posts) → surfaces the real 1×/week rate but flags it as benchmark-grade", () => {
    const insights = makeInsights({
      dataQuality: "thin",
      postsAnalyzed: 2,
      postingFrequency: { avgPostsPerWeek: 1, bestPostsPerWeek: 1, weeksObserved: 4 },
    });
    const c = resolveCadence(insights, igKb);
    expect(c.actualPostsPerWeek).toBe(1); // the very signal we want to act on
    expect(c.source).toBe("benchmark"); // but not yet reliable enough to steer by
  });

  it("rich (8 posts + frequency) → trusts the account's own cadence", () => {
    const insights = makeInsights({
      dataQuality: "rich",
      postsAnalyzed: 8,
      postingFrequency: { avgPostsPerWeek: 4, bestPostsPerWeek: 5, weeksObserved: 6 },
    });
    const c = resolveCadence(insights, igKb);
    expect(c.actualPostsPerWeek).toBe(4);
    expect(c.weeksObserved).toBe(6);
    expect(c.source).toBe("account");
  });
});

describe("resolveBestTimes", () => {
  it("always returns at least one slot, even cold-start", () => {
    const insights = makeInsights({ dataQuality: "cold_start", postsAnalyzed: 0 });
    const r = resolveBestTimes(insights, igKb);
    expect(r.times.length).toBeGreaterThan(0);
    expect(r.source).toBe("benchmark");
    expect(r.times).toEqual(
      igKb.bestTimeDefaults.map((t) => ({ dayOfWeek: t.dayOfWeek, hour: t.hour }))
    );
  });

  it("thin best-times (built from 1 post) are ignored in favour of the benchmark", () => {
    const insights = makeInsights({
      dataQuality: "thin",
      postsAnalyzed: 2,
      bestTimes: [{ dayOfWeek: 4, hour: 17, avgEngagement: 27, postCount: 1 }],
    });
    const r = resolveBestTimes(insights, igKb);
    expect(r.source).toBe("benchmark");
  });

  it("rich best-times are used and tagged as account-sourced", () => {
    const insights = makeInsights({
      dataQuality: "rich",
      postsAnalyzed: 8,
      bestTimes: [
        { dayOfWeek: 2, hour: 9, avgEngagement: 30, postCount: 3 },
        { dayOfWeek: 4, hour: 18, avgEngagement: 22, postCount: 4 },
      ],
    });
    const r = resolveBestTimes(insights, igKb);
    expect(r.source).toBe("account");
    expect(r.times).toEqual([
      { dayOfWeek: 2, hour: 9 },
      { dayOfWeek: 4, hour: 18 },
    ]);
  });
});
