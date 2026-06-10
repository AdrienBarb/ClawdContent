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
 * / RivalIQ / Mosseri). Facebook cadence was re-verified specifically because
 * generic "1-2×/day" advice is refuted by the data (engagement-per-post decays
 * with frequency for small Pages).
 *
 * Scope matches `SUPPORTED_PLATFORMS`: Instagram + Facebook only. A parity test
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
  facebook: {
    platform: "facebook",
    displayName: "Facebook",
    // RE-VERIFIED (generic daily-posting advice is wrong for small Pages):
    // Buffer 2025 top-performing brands post ~4.6×/wk; Hootsuite 2025 small-page
    // sweet spot ~2×/wk; Social Media Examiner found 28-29 posts/wk beat 44/wk on
    // reach+engagement. 3-5×/wk balances reach and quality; 2×/wk is an acceptable
    // floor for very small Pages.
    recommendedPostsPerWeek: { min: 3, max: 5 },
    formatMix: [
      {
        format: "photo",
        role: "Engagement lead",
        // Buffer 2026 (52M posts): photos +34.7% engagement vs text, +43.8% vs
        // video; albums 2.9% (Hootsuite 2025).
        bestFor: "The highest-engagement everyday format — single photos and albums.",
      },
      {
        format: "reel",
        role: "Reach & discovery",
        // Hootsuite 2025: Reels get 2-3× the organic reach of regular video.
        bestFor: "Reaching beyond your Page fans. Use for growth, not just engagement.",
      },
      {
        format: "text",
        role: "Conversation",
        // Socialinsider 2026: status/text posts historically high ER but declining.
        bestFor: "Quick questions and updates that spark comments.",
      },
      {
        format: "link",
        role: "Use sparingly",
        // Socialinsider 2026: link posts 0.05% ER — reach is heavily suppressed.
        bestFor: "Only when you must drive off-platform; never a default format.",
      },
    ],
    bestTimeDefaults: PLATFORM_CONFIG.facebook.defaultBestTimes,
    benchmarkEngagementRate: {
      good: 1,
      strong: 5,
      basis:
        "Per-post engagement. Platform median is ~0.15%, but small Pages (<1k) reach 5-9% (follower/reach-based). Zernio reports an impression-based rate, so treat as approximate.",
      source: "Buffer 2026 (52M posts); RivalIQ 2025; Socialinsider 2026",
    },
    principles: [
      "Post 3-5×/week, not daily — engagement-per-post falls as frequency climbs (Social Media Examiner; Buffer 2025).",
      "Lead with photos/albums for engagement and Reels for reach; avoid bare link posts (Buffer & Hootsuite 2025).",
      "Ask questions and reply to every comment — comments and shares are the engine of Facebook reach.",
      "Keep it native: upload media directly instead of linking out.",
    ],
    metricMeaning: {
      engagementRate:
        "Engagement ÷ impressions (per Zernio). 1%+ is healthy for a small Page; 5%+ is strong. Small Pages can far exceed the ~0.15% platform median.",
      reach: "Unique people who saw the post — Facebook does report reach (ground-truthed).",
      shares:
        "Shares are the strongest Facebook reach multiplier — they re-expose the post to a friend's whole network.",
      comments: "Facebook weights comments heavily; questions and replies compound reach.",
      clicks: "Link/profile clicks — meaningful only for posts whose goal is a click-through.",
    },
  },
};

/** KB for a platform, or null if we don't have one (unsupported platform). */
export function getBestPractices(platform: string): PlatformBestPractices | null {
  return BEST_PRACTICES[platform] ?? null;
}
