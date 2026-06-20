import { PLATFORM_CONFIG } from "@/lib/insights/platformConfig";

/**
 * Per-platform "best practices" knowledge base — the expert socle.
 *
 * Two jobs:
 *  1. Thin-data fallback — when an account has too little history to derive its
 *     own cadence / best-times, the strategy leans on these benchmarks instead
 *     of producing nothing.
 *  2. Comparison baseline — "you post 1×/week, the recommended band is 3-5×"
 *     and "carousels earn the most saves" come from here.
 *
 * EVERY number is traced to a cited source in the comment beside it. Figures
 * were web-researched 2026-06-08 (Buffer / Hootsuite / Metricool / Socialinsider
 * / RivalIQ / Mosseri).
 *
 * Scope matches `SUPPORTED_PLATFORMS`: Instagram only. A parity test
 * (`bestPractices.test.ts`) fails if a supported platform is missing an entry.
 */

export interface PostsPerWeekRange {
  /** Recommended floor — fewer than this and consistency/reach suffer. */
  min: number;
  /** Recommended ceiling — beyond this, engagement-per-post decays. */
  max: number;
}

export interface FormatRole {
  /** Content format key (matches how we describe formats to the model). */
  format: string;
  /** What the format is FOR (its job in a growth plan). */
  role: string;
  /** One-line "use it when…" guidance. */
  bestFor: string;
}

export interface EngagementBenchmark {
  /** A healthy per-post engagement rate (%) for a small account. */
  good: number;
  /** A strong per-post engagement rate (%) for a small account. */
  strong: number;
  /** How to read these numbers (calculation basis + Zernio caveat). */
  basis: string;
  /** Cited source(s). */
  source: string;
}

export interface PlatformBestPractices {
  platform: string;
  displayName: string;
  /** Cited recommended posting cadence. */
  recommendedPostsPerWeek: PostsPerWeekRange;
  /**
   * The role each format plays for growth, best → least valuable. ONLY formats
   * Zernio can publish belong here — this doubles as the strategy's
   * publishable-formats allowlist (prompt constraint + assembleStrategy guard).
   */
  formatMix: FormatRole[];
  /** Fallback posting times (UTC, dayOfWeek 0=Monday) — single source: platformConfig. */
  bestTimeDefaults: { dayOfWeek: number; hour: number }[];
  /** What a "good" per-post engagement rate looks like. */
  benchmarkEngagementRate: EngagementBenchmark;
  /** Durable, cited principles that steer drafting + strategy. */
  principles: string[];
  /** Plain-language meaning of each metric we surface (helps the LLM reason). */
  metricMeaning: Record<string, string>;
}

export const BEST_PRACTICES: Record<string, PlatformBestPractices> = {
  instagram: {
    platform: "instagram",
    displayName: "Instagram",
    // Buffer 2025 (2.1M-post study, 102k accounts): 3-5×/wk is the sustainable
    // growth band (+~12% reach/post and 2-3× follower growth vs 1-2×/wk). 6-9×
    // squeezes a bit more growth but risks burnout. Hootsuite 2025: consistency
    // and quality outrank raw volume.
    recommendedPostsPerWeek: { min: 3, max: 5 },
    formatMix: [
      {
        format: "reel",
        role: "Reach & discovery (non-followers)",
        // Metricool 2024: Reels reach 37.87% — the highest-reach format. Watch
        // time is IG's #1 ranking signal (Mosseri, Jan 2025): the first 3s decide.
        bestFor: "Getting in front of people who don't follow you yet. Lead format — aim ~60% of posts.",
      },
      {
        format: "carousel",
        role: "Engagement & saves",
        // Socialinsider 2026 (35M posts): carousels 1.92% ER vs 0.50% Reels /
        // 0.37% images; +247% interactions (Metricool). Saves + DM sends (weighted
        // 3-5× likes, Buffer 2026) are the signals that compound.
        bestFor: "Earning saves and shares — how-tos, tips, before/after. ~25% of posts.",
      },
      // NB: no "story" entry on purpose — Zernio cannot publish Stories, so the
      // strategy must never plan around them. `formatMix` doubles as the
      // publishable-formats allowlist (see strategyContext prompt + guard).
      {
        format: "image",
        role: "Low-reach filler",
        // Socialinsider 2026: single images lowest ER (0.37%), -17% YoY.
        bestFor: "Occasional brand/culture posts. Don't rely on it for growth.",
      },
    ],
    bestTimeDefaults: PLATFORM_CONFIG.instagram.defaultBestTimes,
    benchmarkEngagementRate: {
      good: 3,
      strong: 6,
      basis:
        "Per-post engagement. Small (<10k) IG accounts run ~4-6% (reach-based). Zernio reports an impression-based rate, so treat as approximate; platform median is only ~0.4%.",
      source: "Metricool 2025; RivalIQ 2025; Hootsuite 2026",
    },
    principles: [
      "Consistency beats volume — 3-5 quality posts/week outperform daily mediocre ones (Buffer & Hootsuite 2025).",
      "Lead with Reels for reach: the first 3 seconds decide watch time, IG's #1 ranking signal (Mosseri, Jan 2025).",
      "Use carousels to earn saves and DM shares — sends are weighted ~3-5× a like for distribution (Buffer 2026).",
      "Hook in the opening line; keep one clear CTA near the end.",
    ],
    metricMeaning: {
      engagementRate:
        "Engagement ÷ impressions (per Zernio). 3%+ is healthy for a small account; 6%+ is strong.",
      saves:
        "A save = 'I'll come back to this' — a strong intent signal IG rewards. Carousels and how-tos earn the most.",
      shares:
        "Shares/DM sends push a post to non-followers; weighted ~3-5× a like for reach.",
      igReelsAvgWatchTime:
        "Average seconds watched on a Reel — the single biggest lever for Reel reach. Higher = more distribution.",
      reach:
        "Unique accounts that saw the post. Reach above your follower count means the post escaped your audience (good).",
      comments: "Conversation depth — replying back compounds it.",
    },
  },
};

/** KB for a platform, or null if we don't have one (unsupported platform). */
export function getBestPractices(platform: string): PlatformBestPractices | null {
  return BEST_PRACTICES[platform] ?? null;
}

/**
 * Brand-level "best practices" socle — the Instagram umbrella used to build the
 * social-independent BUSINESS strategy (`computeBusinessStrategy`). NOT a member
 * of `BEST_PRACTICES` (that map is pinned to `SUPPORTED_PLATFORMS` by a parity
 * test); it's a standalone socle so the strategy plumbing
 * (`buildStrategyInputs`/`buildStrategyPrompt`/`assembleStrategy`) can run with
 * `insights: null` and no per-account anchor. `displayName` drives the prompt
 * copy ("Instagram").
 */
export const BRAND_BEST_PRACTICES: PlatformBestPractices = {
  platform: "brand",
  displayName: "Instagram",
  recommendedPostsPerWeek: { min: 3, max: 5 },
  formatMix: [
    {
      format: "reel",
      role: "Reach & discovery",
      bestFor:
        "Getting in front of people who don't follow you yet. Lead format for growth, aim ~half of posts.",
    },
    {
      format: "carousel",
      role: "Engagement & saves",
      bestFor:
        "Earning saves and shares — how-tos, tips, before/after, step-by-steps.",
    },
    {
      format: "photo",
      role: "Everyday engagement",
      bestFor:
        "The highest-engagement everyday format — single photos, behind-the-scenes, product and people shots.",
    },
  ],
  bestTimeDefaults: PLATFORM_CONFIG.instagram.defaultBestTimes,
  benchmarkEngagementRate: {
    good: 2,
    strong: 5,
    basis:
      "Per-post engagement on Instagram for a small account. Impression-based, so treat as approximate.",
    source: "Buffer 2026; Metricool 2025; RivalIQ 2025",
  },
  principles: [
    "Consistency beats volume — 3-5 quality posts/week outperform daily mediocre ones.",
    "Lead with Reels for reach (the first 3 seconds decide), carousels for saves, photos for everyday engagement.",
    "Hook in the opening line; keep one clear CTA near the end.",
    "Reply to comments — conversation compounds reach.",
  ],
  metricMeaning: {
    engagementRate:
      "Engagement ÷ impressions. ~2%+ is healthy for a small account; 5%+ is strong.",
    saves:
      "A save signals 'I'll come back to this' — carousels and how-tos earn the most.",
    shares:
      "Shares/sends push a post to people who don't follow you yet — the strongest reach multiplier.",
    reach:
      "Unique accounts that saw the post. Reach above your follower count means it escaped your audience (good).",
    comments: "Conversation depth — replying back compounds it.",
  },
};
