import type { AnalyticsPost } from "@/lib/late/mutations";
import type { StoredPost } from "@/lib/schemas/insights";
import { getPlatformConfig } from "@/lib/insights/platformConfig";

export interface VoiceStats {
  avgPostLengthChars: number;
  avgSentenceLength: number;
  emojiDensity: number; // 0-1, fraction of posts containing at least one emoji
  hashtagsPerPost: number;
  questionFrequency: number; // 0-1
  linkFrequency: number; // 0-1
}

export interface HashtagCount {
  tag: string;
  uses: number;
}

export interface ContentMixEntry {
  type: string;
  percentage: number;
}

export type PrimaryMetric = "likes" | "views" | "saves" | "engagementRate";

const HASHTAG_RE = /#[\p{L}\p{N}_]+/gu;
const EMOJI_RE = /\p{Extended_Pictographic}/u;
const SENTENCE_SPLIT_RE = /[.!?]+\s+|\n+/;
const URL_RE = /https?:\/\//i;

export function extractHashtags(posts: AnalyticsPost[], limit = 15): HashtagCount[] {
  const counts = new Map<string, number>();
  for (const post of posts) {
    const matches = post.content?.match(HASHTAG_RE);
    if (!matches) continue;
    for (const raw of matches) {
      const tag = raw.toLowerCase();
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag, uses]) => ({ tag, uses }));
}

export function computeVoiceStats(posts: AnalyticsPost[]): VoiceStats {
  if (posts.length === 0) {
    return {
      avgPostLengthChars: 0,
      avgSentenceLength: 0,
      emojiDensity: 0,
      hashtagsPerPost: 0,
      questionFrequency: 0,
      linkFrequency: 0,
    };
  }

  let totalChars = 0;
  let totalSentenceLength = 0;
  let totalSentences = 0;
  let postsWithEmoji = 0;
  let totalHashtags = 0;
  let postsWithQuestion = 0;
  let postsWithLink = 0;

  for (const post of posts) {
    const content = post.content ?? "";
    totalChars += content.length;

    const sentences = content
      .split(SENTENCE_SPLIT_RE)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    for (const s of sentences) {
      totalSentenceLength += s.length;
    }
    totalSentences += sentences.length;

    if (EMOJI_RE.test(content)) postsWithEmoji += 1;

    const hashtagMatches = content.match(HASHTAG_RE);
    totalHashtags += hashtagMatches ? hashtagMatches.length : 0;

    if (content.includes("?")) postsWithQuestion += 1;
    if (URL_RE.test(content)) postsWithLink += 1;
  }

  return {
    avgPostLengthChars: Math.round(totalChars / posts.length),
    avgSentenceLength: totalSentences > 0 ? Math.round(totalSentenceLength / totalSentences) : 0,
    emojiDensity: round2(postsWithEmoji / posts.length),
    hashtagsPerPost: round2(totalHashtags / posts.length),
    questionFrequency: round2(postsWithQuestion / posts.length),
    linkFrequency: round2(postsWithLink / posts.length),
  };
}

export function computeContentMix(posts: AnalyticsPost[]): ContentMixEntry[] {
  if (posts.length === 0) return [];
  const counts = new Map<string, number>();
  for (const post of posts) {
    const type = (post as AnalyticsPost & { mediaType?: string }).mediaType ?? "text";
    counts.set(type, (counts.get(type) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([type, count]) => ({
      type,
      percentage: round1((count / posts.length) * 100),
    }))
    .sort((a, b) => b.percentage - a.percentage);
}

export function pickPrimaryMetric(platform: string): PrimaryMetric {
  return getPlatformConfig(platform).primaryMetric;
}

export function computeAvgPrimaryMetric(
  posts: AnalyticsPost[],
  primary: PrimaryMetric
): number {
  if (posts.length === 0) return 0;
  let total = 0;
  for (const post of posts) {
    total += post.analytics[primary] ?? 0;
  }
  return round2(total / posts.length);
}

/**
 * Mean engagementRate across all posts (the honest account-wide average),
 * computed BEFORE top/bottom trimming. Returns null when there are no posts so
 * downstream can say "no data" rather than a misleading 0%.
 */
export function computeAvgEngagementRate(posts: AnalyticsPost[]): number | null {
  if (posts.length === 0) return null;
  let total = 0;
  for (const post of posts) {
    total += post.analytics.engagementRate ?? 0;
  }
  return round2(total / posts.length);
}

/** Resolve a post's platform-level account id (string or populated object). */
function resolvePlatformAccountId(
  accountId: string | { _id: string } | undefined
): string | undefined {
  if (!accountId) return undefined;
  return typeof accountId === "string" ? accountId : accountId._id;
}

/**
 * True when the post was published to `lateAccountId` (matched via any of its
 * `platforms[].accountId`). Returns false when the post carries no resolvable
 * platform account id — so it can't be misattributed. Used to scope a
 * platform-wide analytics response down to a single account when a profile has
 * two same-platform accounts (prevents one account's captions/metrics bleeding
 * into a sibling's insights/strategy).
 */
export function postBelongsToAccount(
  post: AnalyticsPost,
  lateAccountId: string
): boolean {
  const platforms = post.platforms;
  if (!platforms || platforms.length === 0) return false;
  return platforms.some(
    (p) => resolvePlatformAccountId(p.accountId) === lateAccountId
  );
}

export function rankByPrimaryMetric(
  posts: AnalyticsPost[],
  primary: PrimaryMetric,
  limit = 5
): AnalyticsPost[] {
  return [...posts]
    .sort((a, b) => (b.analytics[primary] ?? 0) - (a.analytics[primary] ?? 0))
    .slice(0, limit);
}

/**
 * The metric we rank top/bottom posts by. `engagementRate` (engagement ÷
 * impressions, per Zernio) normalises across reach so a small post that
 * resonated isn't buried under a high-impression dud — the right lens for
 * "what's working vs what isn't". Separate from `primaryMetric` (which still
 * drives `avgPrimaryMetric`). Ground-truthed 2026-06-08.
 */
export const SUCCESS_METRIC: PrimaryMetric = "engagementRate";

/** Deterministic order: engagementRate desc, then impressions desc, then _id asc. */
function compareBySuccessDesc(a: AnalyticsPost, b: AnalyticsPost): number {
  const er = (b.analytics.engagementRate ?? 0) - (a.analytics.engagementRate ?? 0);
  if (er !== 0) return er;
  const imp = (b.analytics.impressions ?? 0) - (a.analytics.impressions ?? 0);
  if (imp !== 0) return imp;
  return (a._id ?? "").localeCompare(b._id ?? "");
}

/**
 * Split posts into the best and worst performers by SUCCESS_METRIC. `bottom`
 * is always DISJOINT from `top` (drawn from the posts ranked below the top
 * `limit`) and ordered worst-first. When there are ≤ `limit` posts there's no
 * meaningful "bottom" → `bottom` is empty.
 */
export function selectTopAndBottomPosts(
  posts: AnalyticsPost[],
  limit = 5
): { top: AnalyticsPost[]; bottom: AnalyticsPost[] } {
  const ranked = [...posts].sort(compareBySuccessDesc);
  const top = ranked.slice(0, limit);
  const remainder = ranked.slice(limit); // strictly worse than every `top` entry
  const bottom = remainder.slice(-limit).reverse(); // worst-first, disjoint from top
  return { top, bottom };
}

/**
 * Map a raw Zernio analytics post to the persisted shape. Captions are stored
 * IN FULL (no truncation — the model needs the real voice). Defensive `?? 0` on
 * metric fields guards against older synced rows that predate watch-time/clicks.
 */
export function toStoredPost(post: AnalyticsPost): StoredPost {
  const a = post.analytics;
  return {
    content: post.content ?? "",
    mediaType: post.mediaType ?? null,
    publishedAt: post.publishedAt,
    metrics: {
      impressions: a.impressions ?? 0,
      reach: a.reach ?? 0,
      likes: a.likes ?? 0,
      comments: a.comments ?? 0,
      shares: a.shares ?? 0,
      saves: a.saves ?? 0,
      clicks: a.clicks ?? 0,
      views: a.views ?? 0,
      igReelsAvgWatchTime: a.igReelsAvgWatchTime ?? 0,
      igReelsVideoViewTotalTime: a.igReelsVideoViewTotalTime ?? 0,
      engagementRate: a.engagementRate ?? 0,
    },
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
