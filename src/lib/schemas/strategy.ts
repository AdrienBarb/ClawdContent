import { z } from "zod";

const bestTimeSlotSchema = z.object({
  day: z.number().min(0).max(6),
  hour: z.number().min(0).max(23),
  score: z.number(),
});

/**
 * Schema for Claude's structured output. NO array length / numeric range
 * constraints — Anthropic structured output rejects minItems/maxItems and
 * minimum/maximum. We trim and clamp in code after generation.
 */
export const strategyClaudeSchema = z.object({
  postsPerWeek: z.number(),
  contentPillars: z.array(z.string()),
  voiceRules: z.array(z.string()),
  bestTimes: z.array(
    z.object({
      day: z.number(),
      hour: z.number(),
      score: z.number(),
    })
  ),
  imageStyle: z.string(),
});

/**
 * Schema for stored strategy (with caps + ranges enforced for internal
 * validation). Matches the SocialAccount.strategy comment in schema.prisma.
 */
export const strategySchema = z.object({
  postsPerWeek: z.number().int().min(1).max(35),
  contentPillars: z.array(z.string()).min(3).max(5),
  voiceRules: z.array(z.string()).min(2).max(4),
  bestTimes: z.array(bestTimeSlotSchema).min(1).max(14),
  imageStyle: z.string(),
});

export type Strategy = z.infer<typeof strategySchema>;
export type StrategyBestTime = z.infer<typeof bestTimeSlotSchema>;
