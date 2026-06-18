import { describe, it, expect } from "vitest";
import {
  buildPaywallPlan,
  selectPrimaryAccount,
  formatLabel,
  goalLabel,
  type RawAccountInput,
} from "@/lib/insights/paywallPlan";
import { makeInsights } from "@/lib/insights/__fixtures__/zernio";
import type { SocialStrategy } from "@/lib/schemas/strategy";

// A schema-valid stored strategy (parseStrategy validates it on the way in). The
// paywall "after" is fed by the brand-level businessStrategy, so this stands in
// for `User.businessStrategy`; it's also reused as a per-account `strategy` to
// exercise the selectPrimaryAccount strategy-ready tiebreaker.
function makeStrategy(over: Partial<SocialStrategy> = {}): SocialStrategy {
  return {
    version: 1,
    generatedAt: "2026-06-09T00:00:00.000Z",
    model: "claude-sonnet-4-6",
    goal: "find_customers",
    dataQuality: "rich",
    positioning: "A cozy neighborhood bakery known for fresh morning bakes.",
    summary: "Post more, lean into Reels, rotate three themes.",
    contentPillars: [
      { name: "Behind the bakes", description: "Your morning process" },
      { name: "Customer love", description: "Reviews and regulars" },
      { name: "This week's specials", description: "What's fresh" },
    ],
    postIdeas: [
      { idea: "A 15-sec reel of croissants leaving the oven", format: "reel", pillar: "Behind the bakes", why: "Reels reach new locals" },
      { idea: "Carousel: 5 signs of a great local bakery", format: "carousel", pillar: "Customer love", why: "Saves + shares" },
      { idea: "Photo of this week's special tart", format: "image", pillar: "This week's specials", why: "Drives walk-ins" },
      { idea: "Reel: meet the baker", format: "reel", pillar: "Behind the bakes", why: "Builds trust" },
      { idea: "Customer testimonial carousel", format: "carousel", pillar: "Customer love", why: "Social proof" },
    ],
    formatPlan: [
      { format: "reel", action: "start", rationale: "Reels drive reach" },
      { format: "carousel", action: "increase", rationale: "Carousels earn saves" },
      { format: "image", action: "maintain", rationale: "Keep your photo cadence" },
      { format: "story", action: "start", rationale: "Daily presence" },
    ],
    cadence: {
      currentPerWeek: 1,
      targetPerWeek: 5,
      rationale: "Ramp to 5×/week for consistency",
      source: "account",
    },
    doubleDown: ["Customer stories", "Behind-the-scenes"],
    stop: ["Posting only when you remember"],
    ...over,
  };
}

function makeAccount(over: Partial<RawAccountInput> = {}): RawAccountInput {
  return {
    id: "acc-1",
    platform: "instagram",
    username: "yourbakery",
    analysisStatus: "completed",
    insights: makeInsights({
      dataQuality: "rich",
      postingFrequency: { avgPostsPerWeek: 1, bestPostsPerWeek: 2, weeksObserved: 5 },
      contentMix: [
        { type: "image", percentage: 92 },
        { type: "text", percentage: 8 },
      ],
      avgEngagementRate: 2.3,
    }),
    strategy: makeStrategy(),
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
    ...over,
  };
}

describe("formatLabel", () => {
  it("maps known formats", () => {
    expect(formatLabel("reel")).toBe("Reels");
    expect(formatLabel("carousel")).toBe("Carousels");
    expect(formatLabel("image")).toBe("Photos");
    expect(formatLabel("photo")).toBe("Photos");
    expect(formatLabel("story")).toBe("Stories");
    expect(formatLabel("video")).toBe("Video");
    expect(formatLabel("text")).toBe("Posts");
  });
  it("title-cases unknown formats", () => {
    expect(formatLabel("poll")).toBe("Poll");
  });
});

describe("goalLabel", () => {
  it("maps goals to verb phrases", () => {
    expect(goalLabel("find_customers")).toBe("get found by new customers");
    expect(goalLabel("authority")).toBe("become the go-to expert in your space");
    expect(goalLabel(null)).toBeNull();
  });
});

describe("buildPaywallPlan — ready (strategy-only reveal)", () => {
  const plan = buildPaywallPlan({
    account: makeAccount(),
    businessStrategy: makeStrategy(),
    goal: "find_customers",
    businessName: "Your Bakery",
  });

  it("is ready with an after block once the business strategy exists", () => {
    expect(plan.status).toBe("ready");
    expect(plan.after).not.toBeNull();
  });

  it("surfaces the cadence, goal framing, and account handle", () => {
    expect(plan.after?.postsPerWeek).toBe(5);
    expect(plan.goalLabel).toBe("get found by new customers");
    expect(plan.account?.handle).toBe("yourbakery");
    expect(plan.businessName).toBe("Your Bakery");
  });

  it("carries NO before/after comparison fields (strategy-only step)", () => {
    expect(plan).not.toHaveProperty("before");
    expect(plan).not.toHaveProperty("dataQuality");
  });

  it("orders target formats Reels-first and lists newly added formats", () => {
    expect(plan.after?.targetFormatLabels).toEqual(["Reels", "Carousels", "Photos"]);
    expect(plan.after?.newFormatLabels).toEqual(["Reels", "Carousels"]);
  });

  it("scrubs unpublishable Stories from the strategy", () => {
    // makeStrategy carries a "story" formatPlan entry (pre-guard stored shape) —
    // Zernio can't publish Stories, so the plan must never surface it.
    expect(plan.after?.formatPlan.map((f) => f.label)).not.toContain("Stories");
  });

  it("lists concrete, business-specific post ideas", () => {
    expect(plan.after?.ideas).toHaveLength(3);
    expect(plan.after?.ideas[0].formatLabel).toBe("Reels");
  });

  it("never leaks the engine/model name", () => {
    const json = JSON.stringify(plan);
    expect(json).not.toContain("claude");
    expect(json).not.toMatch(/"model"/);
  });
});

describe("buildPaywallPlan — cold-start business strategy", () => {
  it("still produces a full after-plan from the benchmark strategy", () => {
    const plan = buildPaywallPlan({
      account: makeAccount({ strategy: null }),
      businessStrategy: makeStrategy({
        dataQuality: "cold_start",
        cadence: {
          currentPerWeek: null,
          targetPerWeek: 3,
          rationale: "Start with 3×/week for consistency",
          source: "benchmark",
        },
      }),
      goal: "build_community",
      businessName: "Fresh Start Co",
    });
    expect(plan.status).toBe("ready");
    expect(plan.after?.postsPerWeek).toBe(3);
  });
});

describe("buildPaywallPlan — building (no business strategy yet)", () => {
  it("is building with no after-plan while the business strategy hasn't landed", () => {
    const plan = buildPaywallPlan({
      account: makeAccount(),
      businessStrategy: null,
      goal: null,
      businessName: null,
    });
    expect(plan.status).toBe("building");
    expect(plan.after).toBeNull();
  });
});

describe("buildPaywallPlan — brand-level, account-agnostic", () => {
  it("reveals the brand strategy even with no connected account", () => {
    const plan = buildPaywallPlan({
      account: null,
      businessStrategy: makeStrategy(),
      goal: "authority",
      businessName: "Solo Brand",
    });
    expect(plan.status).toBe("ready");
    expect(plan.account).toBeNull();
    expect(plan.after?.postsPerWeek).toBe(5);
  });
});

describe("selectPrimaryAccount", () => {
  it("returns null when no supported account exists", () => {
    expect(selectPrimaryAccount([])).toBeNull();
    expect(
      selectPrimaryAccount([makeAccount({ platform: "tiktok" })])
    ).toBeNull();
  });

  it("prefers an account with a strategy already authored", () => {
    const withStrategy = makeAccount({ id: "ready", platform: "facebook" });
    const building = makeAccount({
      id: "building",
      platform: "instagram",
      strategy: null,
    });
    expect(selectPrimaryAccount([building, withStrategy])?.id).toBe("ready");
  });

  it("prefers the richer data tier over platform", () => {
    const igThin = makeAccount({
      id: "ig-thin",
      platform: "instagram",
      insights: makeInsights({ dataQuality: "thin" }),
    });
    const fbRich = makeAccount({
      id: "fb-rich",
      platform: "facebook",
      insights: makeInsights({ dataQuality: "rich" }),
    });
    expect(selectPrimaryAccount([igThin, fbRich])?.id).toBe("fb-rich");
  });

  it("breaks an equal-readiness, equal-tier tie in favor of Instagram", () => {
    const fb = makeAccount({
      id: "fb",
      platform: "facebook",
      insights: makeInsights({ dataQuality: "rich" }),
    });
    const ig = makeAccount({
      id: "ig",
      platform: "instagram",
      insights: makeInsights({ dataQuality: "rich" }),
    });
    // Both strategy-ready, both rich → platformRank decides.
    expect(selectPrimaryAccount([fb, ig])?.id).toBe("ig");
  });

  it("ignores unsupported platforms when picking", () => {
    const tiktok = makeAccount({ id: "tt", platform: "tiktok" });
    const ig = makeAccount({ id: "ig", platform: "instagram" });
    expect(selectPrimaryAccount([tiktok, ig])?.id).toBe("ig");
  });
});
