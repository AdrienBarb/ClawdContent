import { z } from "zod";

export const createFromBriefRequestSchema = z.object({
  accountIds: z
    .array(z.string().min(1))
    .min(1)
    .max(10)
    .refine((arr) => new Set(arr).size === arr.length, {
      message: "Duplicate accountIds are not allowed",
    }),
  brief: z.string().trim().min(1).max(1000),
});

export type CreateFromBriefRequest = z.infer<typeof createFromBriefRequestSchema>;

const briefPostSchema = z.object({
  content: z.string(),
  reasoning: z.string(),
});

/**
 * Schema for Claude's structured output. NO array length constraints
 * (minItems / maxItems) and NO integer bounds (minimum / maximum) — Anthropic
 * structured output rejects both. The array length IS the count; we slice
 * to the cap in code after Claude returns.
 */
export const briefOutputClaudeSchema = z.object({
  posts: z.array(briefPostSchema),
});
