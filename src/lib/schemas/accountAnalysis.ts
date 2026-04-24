import { z } from "zod";

export const bestPerformingPostSchema = z.object({
  content: z.string(),
  engagement: z.number(),
  type: z.string(),
});

export const insightsSchema = z.object({
  postCount: z.number(),
  topTopics: z.array(z.string()),
  contentStyle: z.string(),
  bestPerformingPosts: z.array(bestPerformingPostSchema),
  avgEngagementRate: z.number(),
  postingFrequency: z.string(),
  contentMix: z.array(z.object({ type: z.string(), percentage: z.number() })),
  topHashtags: z.array(z.string()),
});

export type Insights = z.infer<typeof insightsSchema>;

export const postSuggestionSchema = z.object({
  content: z.string(),
  contentType: z.string(),
  suggestedDay: z.number(),
  suggestedHour: z.number(),
  reasoning: z.string(),
});

export type PostSuggestion = z.infer<typeof postSuggestionSchema>;

export const analyzeResultSchema = z.object({
  insights: insightsSchema,
  suggestions: z.array(postSuggestionSchema),
});

export type AnalyzeResult = z.infer<typeof analyzeResultSchema>;

export const analyzeInputSchema = z.object({
  accountId: z.string().min(1),
});
