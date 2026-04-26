import { z } from "zod";

export const INSIGHTS_VERSION = 2;

export const dataQualitySchema = z.enum([
  "rich",
  "thin",
  "cold_start",
  "platform_no_history",
]);

export const primaryMetricSchema = z.enum([
  "likes",
  "views",
  "saves",
  "engagementRate",
]);

export const metaSchema = z.object({
  version: z.literal(2),
  dataQuality: dataQualitySchema,
  analyzedAt: z.string(),
  postsAnalyzed: z.number(),
  syncTriggered: z.boolean(),
  nextRefreshAt: z.string().nullable(),
  /** True when this account's inferred zone was borrowed from another platform of the same user. */
  voiceBorrowedFromPlatform: z.string().nullable(),
});

const postMetricsSchema = z.object({
  impressions: z.number(),
  reach: z.number(),
  likes: z.number(),
  comments: z.number(),
  shares: z.number(),
  saves: z.number(),
  views: z.number(),
  engagementRate: z.number(),
});

const topPostSchema = z.object({
  content: z.string(),
  mediaType: z.string().nullable(),
  publishedAt: z.string().nullable(),
  metrics: postMetricsSchema,
});

const bestTimeSlotSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  hour: z.number().min(0).max(23),
  avgEngagement: z.number(),
  postCount: z.number(),
});

const postingFrequencySchema = z.object({
  avgPostsPerWeek: z.number(),
  bestPostsPerWeek: z.number(),
  weeksObserved: z.number(),
});

export const zernioZoneSchema = z.object({
  account: z.object({
    followersCount: z.number().nullable(),
    growth30d: z.number().nullable(),
    growth30dPercentage: z.number().nullable(),
    displayName: z.string().nullable(),
  }),
  topPosts: z.array(topPostSchema).max(5),
  bestTimes: z.array(bestTimeSlotSchema).nullable(),
  postingFrequency: postingFrequencySchema.nullable(),
});

export const computedZoneSchema = z.object({
  primaryMetric: primaryMetricSchema,
  avgPrimaryMetric: z.number(),
  contentMix: z.array(z.object({ type: z.string(), percentage: z.number() })),
  extractedHashtags: z
    .array(z.object({ tag: z.string(), uses: z.number() }))
    .max(15),
  voiceStats: z.object({
    avgPostLengthChars: z.number(),
    avgSentenceLength: z.number(),
    emojiDensity: z.number(),
    hashtagsPerPost: z.number(),
    questionFrequency: z.number(),
    linkFrequency: z.number(),
  }),
});

/**
 * Schema for Claude's structured output. NO array length constraints — Anthropic
 * structured output rejects both minItems and maxItems. We trim in code after.
 */
export const inferredZoneClaudeSchema = z.object({
  topics: z.array(z.string()),
  toneSummary: z.string(),
  performingPatterns: z.array(z.string()),
  confidence: z.enum(["high", "medium", "low"]),
});

/** Schema for stored insights (with caps enforced for our internal validation). */
export const inferredZoneSchema = z.object({
  topics: z.array(z.string()).max(8),
  toneSummary: z.string(),
  performingPatterns: z.array(z.string()).max(3),
  confidence: z.enum(["high", "medium", "low"]),
});

export const insightsV2Schema = z.object({
  meta: metaSchema,
  zernio: zernioZoneSchema,
  computed: computedZoneSchema,
  inferred: inferredZoneSchema.nullable(),
});

export type Insights = z.infer<typeof insightsV2Schema>;
export type InferredZone = z.infer<typeof inferredZoneSchema>;
export type ZernioZone = z.infer<typeof zernioZoneSchema>;
export type ComputedZone = z.infer<typeof computedZoneSchema>;
export type InsightsMeta = z.infer<typeof metaSchema>;
export type DataQuality = z.infer<typeof dataQualitySchema>;
