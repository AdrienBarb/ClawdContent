import { describe, it, expect } from "vitest";
import {
  formatGoalContext,
  formatStrategyContext,
} from "@/lib/services/promptContext";
import type { SocialStrategy } from "@/lib/schemas/strategy";

describe("formatGoalContext", () => {
  it("returns '' for a missing/unknown goal (never invents one)", () => {
    expect(formatGoalContext(null)).toBe("");
    expect(formatGoalContext(undefined)).toBe("");
    expect(formatGoalContext("nonsense_goal")).toBe("");
  });

  it("renders a steer for each real goal, with a header by default", () => {
    const block = formatGoalContext("find_customers");
    expect(block).toContain("## Goal");
    expect(block.toLowerCase()).toContain("find new customers");
  });

  it("can omit the header", () => {
    const block = formatGoalContext("authority", { withHeader: false });
    expect(block).not.toContain("## Goal");
    expect(block.toLowerCase()).toContain("authority");
  });
});

const strategy: SocialStrategy = {
  version: 1,
  generatedAt: "2026-06-08T00:00:00.000Z",
  model: "claude-sonnet-4-6",
  goal: "find_customers",
  dataQuality: "rich",
  positioning: "Be the neighbourhood coffee expert.",
  summary: "Lean into Reels and latte art.",
  contentPillars: [
    { name: "Behind the bar", description: "BTS of the craft" },
    { name: "Customer stories", description: "regulars + reviews" },
  ],
  postIdeas: [],
  formatPlan: [],
  cadence: { currentPerWeek: 2, targetPerWeek: 4, rationale: "ramp up", source: "account" },
  doubleDown: ["Reels with latte art"],
  stop: ["bare link posts"],
};

describe("formatStrategyContext", () => {
  it("returns '' when there is no strategy", () => {
    expect(formatStrategyContext(null)).toBe("");
  });

  it("renders pillars, double-down and stop as a compact steer", () => {
    const block = formatStrategyContext(strategy);
    expect(block).toContain("## Strategy to follow");
    expect(block).toContain("Content pillars: Behind the bar, Customer stories");
    expect(block).toContain("Lean into (working): Reels with latte art");
    expect(block).toContain("Avoid / fix: bare link posts");
  });

  it("does NOT leak positioning or post ideas into the draft prompt", () => {
    const block = formatStrategyContext(strategy);
    expect(block).not.toContain("neighbourhood coffee expert");
  });

  it("returns '' when the strategy has no actionable lists", () => {
    const empty: SocialStrategy = {
      ...strategy,
      contentPillars: [],
      doubleDown: [],
      stop: [],
    };
    expect(formatStrategyContext(empty)).toBe("");
  });
});
