import "server-only";
import type { AnalyticsPost } from "@/lib/late/mutations";
import { getPlatformConfig } from "@/lib/insights/platformConfig";
import { preview } from "@/lib/ai/preview";

const PREVIEW_LEN = 60;

export interface OutcomePost {
  id: string;
  content: string;
  platform: string;
  metric: string;
  value: number;
  vsAverage: number;
  publishedAt: string | null;
}

export interface OutcomePatterns {
  bestPlatform: string | null;
  bestHour: number | null;
  bestContentType: string | null;
}

export interface OutcomeFailure {
  platform: string;
  count: number;
}

export interface OutcomeSnapshotPayload {
  publishedCount: number;
  topPerformers: OutcomePost[];
  underperformers: OutcomePost[];
  patterns: OutcomePatterns;
  failedPosts: OutcomeFailure[];
}

/**
 * Picks the per-platform "primary" metric from the platform config (likes for
 * IG/FB, views for TikTok/YT, saves for Pinterest). Falls back to engagementRate
 * when the platform config is unknown.
 */
function metricForPost(p: AnalyticsPost): { metric: string; value: number } {
  const config = getPlatformConfig(p.platform);
  const primary = config?.primaryMetric ?? "likes";
  const value =
    primary === "likes"
      ? p.analytics.likes
      : primary === "views"
        ? p.analytics.views
        : primary === "saves"
          ? p.analytics.saves
          : p.analytics.engagementRate;
  return { metric: primary, value };
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Computes the outcome snapshot from a flat list of analytics posts. Pure
 * function — accepts data, returns the shape we persist. The Inngest cron is
 * the only caller in production; testing it standalone is trivial because of
 * this signature.
 *
 * Rules:
 *   - Need ≥5 published posts globally to consider any signal
 *   - Top: top 2 posts where value ≥ 2× median (within their platform's metric)
 *   - Under: bottom 1 where value ≤ 0.3× median AND median > 0
 *   - Pattern: highest avg for platform / hour-of-day / contentType across all posts
 *   - Failed: tally of posts with status === "failed" or status === "error"
 */
export function computeOutcomeSnapshot(
  posts: AnalyticsPost[]
): OutcomeSnapshotPayload | null {
  const published = posts.filter(
    (p) => p.status === "published" && p.publishedAt !== null
  );
  if (published.length < 5) return null;

  // Group by platform so the median is comparable inside each platform.
  const byPlatform = new Map<string, AnalyticsPost[]>();
  for (const p of published) {
    const list = byPlatform.get(p.platform) ?? [];
    list.push(p);
    byPlatform.set(p.platform, list);
  }

  const enriched: {
    post: AnalyticsPost;
    metric: string;
    value: number;
    vsAverage: number;
  }[] = [];

  for (const [, list] of byPlatform) {
    const values = list.map((p) => metricForPost(p).value);
    const med = median(values);
    if (med <= 0) continue;
    for (const p of list) {
      const { metric, value } = metricForPost(p);
      enriched.push({ post: p, metric, value, vsAverage: value / med });
    }
  }

  const sortedByVs = [...enriched].sort((a, b) => b.vsAverage - a.vsAverage);
  const topPerformers: OutcomePost[] = sortedByVs
    .filter((e) => e.vsAverage >= 2)
    .slice(0, 2)
    .map((e) => ({
      id: e.post._id,
      content: preview(e.post.content, PREVIEW_LEN),
      platform: e.post.platform,
      metric: e.metric,
      value: e.value,
      vsAverage: round1(e.vsAverage),
      publishedAt: e.post.publishedAt,
    }));

  const underperformers: OutcomePost[] = [...sortedByVs]
    .reverse()
    .filter((e) => e.vsAverage <= 0.3)
    .slice(0, 1)
    .map((e) => ({
      id: e.post._id,
      content: preview(e.post.content, PREVIEW_LEN),
      platform: e.post.platform,
      metric: e.metric,
      value: e.value,
      vsAverage: round1(e.vsAverage),
      publishedAt: e.post.publishedAt,
    }));

  const patterns = derivePatterns(enriched);
  const failedPosts = tallyFailed(posts);

  return {
    publishedCount: published.length,
    topPerformers,
    underperformers,
    patterns,
    failedPosts,
  };
}

type Enriched = { post: AnalyticsPost; value: number; vsAverage: number };

function derivePatterns(enriched: Enriched[]): OutcomePatterns {
  if (enriched.length === 0) {
    return { bestPlatform: null, bestHour: null, bestContentType: null };
  }

  const platformAvg = bucketAvg(enriched, (e) => e.post.platform);
  const hourAvg = bucketAvg(enriched, (e) =>
    e.post.publishedAt
      ? String(new Date(e.post.publishedAt).getUTCHours())
      : null
  );
  const typeAvg = bucketAvg(enriched, (e) => e.post.mediaType ?? "text");

  return {
    bestPlatform: pickTop(platformAvg),
    bestHour: (() => {
      const top = pickTop(hourAvg);
      return top !== null ? Number(top) : null;
    })(),
    bestContentType: pickTop(typeAvg),
  };
}

function bucketAvg(
  items: Enriched[],
  keyFn: (item: Enriched) => string | null
): Map<string, number> {
  const sums = new Map<string, { sum: number; n: number }>();
  for (const item of items) {
    const key = keyFn(item);
    if (key === null) continue;
    const entry = sums.get(key) ?? { sum: 0, n: 0 };
    entry.sum += item.value;
    entry.n += 1;
    sums.set(key, entry);
  }
  const avg = new Map<string, number>();
  for (const [k, v] of sums) avg.set(k, v.sum / v.n);
  return avg;
}

function pickTop(map: Map<string, number>): string | null {
  let bestKey: string | null = null;
  let bestVal = -Infinity;
  for (const [k, v] of map) {
    if (v > bestVal) {
      bestKey = k;
      bestVal = v;
    }
  }
  return bestKey;
}

function tallyFailed(posts: AnalyticsPost[]): OutcomeFailure[] {
  const counts = new Map<string, number>();
  for (const p of posts) {
    if (p.status === "failed" || p.status === "error") {
      counts.set(p.platform, (counts.get(p.platform) ?? 0) + 1);
    }
  }
  return Array.from(counts, ([platform, count]) => ({ platform, count }));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
