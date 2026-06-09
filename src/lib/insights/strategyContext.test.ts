import { describe, it, expect } from "vitest";
import {
  buildStrategyInputs,
  buildStrategyPrompt,
  assembleStrategy,
} from "@/lib/insights/strategyContext";
import { toStoredPost } from "@/lib/insights/extract";
import { getBestPractices } from "@/lib/insights/bestPractices";
import { strategyStoredSchema, type StrategyLLMOutput } from "@/lib/schemas/strategy";
import {
  makeInsights,
  realIgReel,
  realFbPost,
} from "@/lib/insights/__fixtures__/zernio";

const igKb = getBestPractices("instagram")!;

const richInsights = makeInsights({
  dataQuality: "rich",
  postsAnalyzed: 8,
  postingFrequency: { avgPostsPerWeek: 2, bestPostsPerWeek: 3, weeksObserved: 5 },
  bestTimes: [{ dayOfWeek: 2, hour: 9, avgEngagement: 30, postCount: 4 }],
  avgEngagementRate: 4.2, // true mean over all fetched posts (not the tails)
  topPosts: [toStoredPost(realIgReel)], // ER 7.35
  bottomPosts: [toStoredPost(realFbPost)], // ER 0
  inferred: {
    topics: ["coffee", "latte art"],
    toneSummary: "warm and playful",
    performingPatterns: ["behind-the-scenes shots"],
    confidence: "high",
  },
  contentMix: [
    { type: "video", percentage: 60 },
    { type: "image", percentage: 40 },
  ],
});

describe("buildStrategyInputs", () => {
  it("cold-start (null insights) → benchmark cadence, no actuals, empty posts", () => {
    const inputs = buildStrategyInputs({
      platform: "instagram",
      insights: null,
      goal: null,
      kb: igKb,
    });
    expect(inputs.dataQuality).toBe("cold_start");
    expect(inputs.cadence.actualPostsPerWeek).toBeNull();
    expect(inputs.cadence.source).toBe("benchmark");
    expect(inputs.avgEngagementRate).toBeNull();
    expect(inputs.voice).toBeNull();
    expect(inputs.topPosts).toEqual([]);
    expect(inputs.bestTimes.times.length).toBeGreaterThan(0); // always resolves
  });

  it("rich insights → account cadence, mean ER over top+bottom, voice from inferred", () => {
    const inputs = buildStrategyInputs({
      platform: "instagram",
      insights: richInsights,
      goal: "find_customers",
      kb: igKb,
    });
    expect(inputs.cadence.source).toBe("account");
    expect(inputs.cadence.actualPostsPerWeek).toBe(2);
    expect(inputs.avgEngagementRate).toBe(4.2); // true all-posts mean from computed zone
    expect(inputs.voice?.tone).toBe("warm and playful");
    expect(inputs.topPosts).toHaveLength(1);
    expect(inputs.goal).toBe("find_customers");
  });
});

describe("buildStrategyPrompt", () => {
  it("grounds the prompt in the goal, cadence band, and real performance", () => {
    const inputs = buildStrategyInputs({
      platform: "instagram",
      insights: richInsights,
      goal: "find_customers",
      kb: igKb,
    });
    const prompt = buildStrategyPrompt(inputs, {
      businessName: "Bean There",
      description: "specialty coffee roaster",
      services: ["espresso", "whole beans"],
    });
    expect(prompt).toContain("find new customers"); // goal steer injected
    expect(prompt).toContain("3-5×/week"); // recommended cadence band
    expect(prompt).toContain("Bean There"); // business context
    expect(prompt).toContain("What's working"); // top posts block
    expect(prompt).toContain("What's underperforming"); // bottom posts block
  });

  it("omits the goal block and flags missing history when there's no data", () => {
    const inputs = buildStrategyInputs({
      platform: "instagram",
      insights: null,
      goal: null,
      kb: igKb,
    });
    const prompt = buildStrategyPrompt(inputs, null);
    expect(prompt).not.toContain("## Goal");
    expect(prompt).toContain("not enough history yet");
    expect(prompt).toContain("Not enough published posts yet");
  });
});

describe("assembleStrategy", () => {
  const overflowingLLM: StrategyLLMOutput = {
    positioning: "Show up as the neighbourhood's coffee expert.",
    summary: "Post more Reels, lean into latte art.",
    contentPillars: Array.from({ length: 9 }, (_, i) => ({
      name: `pillar ${i}`,
      description: "desc",
    })),
    postIdeas: Array.from({ length: 20 }, (_, i) => ({
      idea: `idea ${i}`,
      format: "reel",
      pillar: "pillar 0",
      why: "fits the goal",
    })),
    formatPlan: Array.from({ length: 12 }, (_, i) => ({
      format: `format ${i}`,
      action: "start" as const,
      rationale: "gap",
    })),
    doubleDown: Array.from({ length: 12 }, (_, i) => `do more ${i}`),
    stop: Array.from({ length: 12 }, (_, i) => `stop ${i}`),
    targetPostsPerWeek: 4,
    cadenceRationale: "Move from 2 to 4 to hit the recommended band.",
  };

  const inputs = buildStrategyInputs({
    platform: "instagram",
    insights: richInsights,
    goal: "find_customers",
    kb: igKb,
  });

  it("caps every array to the stored maximum", () => {
    const s = assembleStrategy(overflowingLLM, inputs, "2026-06-08T00:00:00.000Z", "m");
    expect(s.contentPillars).toHaveLength(6);
    expect(s.postIdeas).toHaveLength(12);
    expect(s.formatPlan).toHaveLength(8);
    expect(s.doubleDown).toHaveLength(8);
    expect(s.stop).toHaveLength(8);
  });

  it("stamps the REAL cadence facts (not the model's), keeps the model's target", () => {
    const s = assembleStrategy(overflowingLLM, inputs, "2026-06-08T00:00:00.000Z", "m");
    expect(s.cadence.currentPerWeek).toBe(2); // from inputs (account data)
    expect(s.cadence.source).toBe("account"); // from inputs
    expect(s.cadence.targetPerWeek).toBe(4); // from the model
    expect(s.goal).toBe("find_customers");
    expect(s.generatedAt).toBe("2026-06-08T00:00:00.000Z");
  });

  it("produces an object that passes the stored schema", () => {
    const s = assembleStrategy(overflowingLLM, inputs, "2026-06-08T00:00:00.000Z", "m");
    expect(() => strategyStoredSchema.parse(s)).not.toThrow();
  });
});
