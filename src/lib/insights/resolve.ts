import type { Insights } from "@/lib/schemas/insights";
import type {
  PlatformBestPractices,
  PostsPerWeekRange,
} from "@/lib/insights/bestPractices";

/**
 * Thin-data fallback resolvers.
 *
 * Cadence and best-times must ALWAYS resolve to a usable value so a strategy
 * can be built even for a brand-new account with 0-2 posts: personal signal
 * when there's enough history, otherwise the cited KB benchmark — tagged with a
 * `source` flag so the strategy can be transparent ("based on your data" vs
 * "based on Instagram best practices").
 */

export type ResolvedSource = "account" | "benchmark";

/**
 * Below this many analysed posts, an account's own best-times/cadence are too
 * noisy to trust — the live probe (2026-06-08) showed best-time slots built from
 * a single post (`post_count: 1`). We fall back to the cited KB benchmark.
 * Matches the `rich` tier threshold in `zernioContext`.
 */
export const MIN_POSTS_FOR_PERSONAL = 5;

export interface ResolvedCadence {
  /** The account's real posts/week, or null when unknown. Surfaced even when
   *  thin — "you post ~1×/week" is exactly the signal we want to act on. */
  actualPostsPerWeek: number | null;
  weeksObserved: number;
  /** Cited recommended band from the KB (always present). */
  recommended: PostsPerWeekRange;
  /** Whether `actualPostsPerWeek` is reliable enough to steer by. */
  source: ResolvedSource;
}

export interface ResolvedBestTimes {
  /** Always at least one slot (KB defaults guarantee it). dayOfWeek 0=Monday. */
  times: { dayOfWeek: number; hour: number }[];
  source: ResolvedSource;
}

export function resolveCadence(
  insights: Insights | null,
  kb: PlatformBestPractices
): ResolvedCadence {
  const pf = insights?.zernio.postingFrequency ?? null;
  const postsAnalyzed = insights?.meta.postsAnalyzed ?? 0;
  const hasReliableActual = pf !== null && postsAnalyzed >= MIN_POSTS_FOR_PERSONAL;
  return {
    actualPostsPerWeek: pf?.avgPostsPerWeek ?? null,
    weeksObserved: pf?.weeksObserved ?? 0,
    recommended: kb.recommendedPostsPerWeek,
    source: hasReliableActual ? "account" : "benchmark",
  };
}

export function resolveBestTimes(
  insights: Insights | null,
  kb: PlatformBestPractices
): ResolvedBestTimes {
  const bt = insights?.zernio.bestTimes ?? null;
  const postsAnalyzed = insights?.meta.postsAnalyzed ?? 0;
  if (bt && bt.length > 0 && postsAnalyzed >= MIN_POSTS_FOR_PERSONAL) {
    return {
      times: bt.map((t) => ({ dayOfWeek: t.dayOfWeek, hour: t.hour })),
      source: "account",
    };
  }
  return {
    times: kb.bestTimeDefaults.map((t) => ({ dayOfWeek: t.dayOfWeek, hour: t.hour })),
    source: "benchmark",
  };
}
