import { z } from "zod";

/**
 * Week-plan schemas. Two-schema pattern (project convention): the Claude-safe
 * schema has NO minItems/maxItems on arrays (Anthropic generateObject rejects
 * them) — counts and caps are enforced in code (planWeek.ts).
 */

export const plannedFormatSchema = z.enum([
  "text", // caption only — coerced to a visual for Instagram (which requires media)
  "photo", // photoreal image, no on-image text
  "text_card", // flat graphic with exact on-image copy
  "carousel", // 2-6 slides, cover-anchored
  "reel", // 9:16 video seeded from a hero frame
]);

export type PlannedFormat = z.infer<typeof plannedFormatSchema>;

const slideSchema = z.object({
  headline: z.string().describe("Exact text rendered large on this slide."),
  body: z
    .string()
    .optional()
    .describe("Optional smaller supporting text, rendered exactly."),
});

export const plannedPostClaudeSchema = z.object({
  content: z
    .string()
    .describe(
      "The caption, ready to publish. No surrounding quotes, no 'Post 1:' prefix."
    ),
  reasoning: z
    .string()
    .describe("ONE short sentence on why this post will land this week."),
  topic: z.string().describe("3-6 word label of what the post is about."),
  format: plannedFormatSchema,
  media: z.object({
    imagePrompt: z
      .string()
      .optional()
      .describe(
        "Concrete visual scene for photo/reel hero/text-card background. Describe the SUBJECT (dish, venue, product, people), not abstract vibes."
      ),
    headline: z
      .string()
      .optional()
      .describe("text_card only: exact on-image headline (short)."),
    body: z
      .string()
      .optional()
      .describe("text_card only: exact on-image supporting line."),
    slides: z
      .array(slideSchema)
      .optional()
      .describe("carousel only: 3-6 slides. First slide is the cover."),
    reelPrompt: z
      .string()
      .optional()
      .describe(
        "reel only: camera movement + action for an 8s clip (e.g. 'slow push-in on the plated dish, steam rising')."
      ),
  }),
});

export const weekPlanClaudeSchema = z.object({
  posts: z.array(plannedPostClaudeSchema),
});

export type PlannedPost = z.infer<typeof plannedPostClaudeSchema>;

/** Compact per-post snapshot stored on WeeklyBatch.posts for digest/UI. */
export const batchPostSnapshotSchema = z.object({
  suggestionId: z.string().nullable(),
  externalPostId: z.string().nullable(),
  accountId: z.string(),
  platform: z.string(),
  username: z.string(),
  scheduledAt: z.string(),
  contentPreview: z.string(),
  content: z.string(),
  mediaUrl: z.string().nullable(),
  mediaType: z.enum(["image", "video"]).nullable(),
  // "scheduled" (committed to Zernio) | "staged" (review mode, local) |
  // "needs_media" (held back) | "failed" (commit failed) | "vetoed"
  status: z.string(),
  retriedAt: z.string().nullable().optional(),
});

export type BatchPostSnapshot = z.infer<typeof batchPostSnapshotSchema>;

export const autopilotSettingsSchema = z.object({
  mode: z.enum(["full_auto", "review"]).optional(),
  paused: z.boolean().optional(),
});

export const autopilotBriefSchema = z.object({
  brief: z.string().min(1).max(1000),
});
