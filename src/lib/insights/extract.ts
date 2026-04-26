import type { AnalyticsPost } from "@/lib/late/mutations";
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

export function rankByPrimaryMetric(
  posts: AnalyticsPost[],
  primary: PrimaryMetric,
  limit = 5
): AnalyticsPost[] {
  return [...posts]
    .sort((a, b) => (b.analytics[primary] ?? 0) - (a.analytics[primary] ?? 0))
    .slice(0, limit);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
