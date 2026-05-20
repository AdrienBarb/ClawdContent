import { z } from "zod";

/**
 * Strategy override payload — what the user can edit from the per-platform
 * dashboard's "Customize" drawer. Mirrors `strategySchema` shape but allows
 * a wider postsPerWeek band (±2 of platform default, vs ±1 for auto-gen).
 * Server-side clamps to the platform's hard floor of 1 and a ceiling of 25.
 */
const strategyOverrideBestTimeSchema = z.object({
  day: z.number().int().min(0).max(6),
  hour: z.number().int().min(0).max(23),
  score: z.number().optional(),
});

export const strategyOverrideSchema = z
  .object({
    postsPerWeek: z.number().int().min(1).max(25).optional(),
    contentPillars: z.array(z.string().trim().min(1).max(60)).min(3).max(5).optional(),
    voiceRules: z.array(z.string().trim().min(1).max(200)).min(2).max(4).optional(),
    bestTimes: z.array(strategyOverrideBestTimeSchema).min(1).max(14).optional(),
    imageStyle: z.string().trim().min(1).max(500).optional(),
  })
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one strategy field must be provided"
  );

/** PATCH /api/accounts/[id] — toggle autopublish or override strategy. */
export const patchSocialAccountSchema = z
  .object({
    autopublish: z.boolean().optional(),
    strategy: strategyOverrideSchema.optional(),
  })
  .strict()
  .refine(
    (data) => data.autopublish !== undefined || data.strategy !== undefined,
    "Provide autopublish, strategy, or both"
  );

export type PatchSocialAccountInput = z.infer<typeof patchSocialAccountSchema>;

export const connectAccountSchema = z.object({
  platform: z.enum([
    "twitter",
    "linkedin",
    "instagram",
    "facebook",
    "tiktok",
    "youtube",
    "pinterest",
    "threads",
    "bluesky",
    "reddit",
    "telegram",
    "snapchat",
    "googlebusiness",
  ]),
  returnTo: z.string().optional(),
});

export const disconnectAccountSchema = z.object({
  accountId: z.string().min(1),
});
