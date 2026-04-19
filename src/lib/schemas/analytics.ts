import { z } from "zod";

const dateFormat = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional();

const platformEnum = z
  .enum([
    "twitter",
    "linkedin",
    "bluesky",
    "threads",
    "facebook",
    "instagram",
    "pinterest",
    "tiktok",
    "youtube",
    "mastodon",
    "telegram",
    "discord",
  ])
  .optional();

export const analyticsQuerySchema = z.object({
  period: z.enum(["7d", "30d", "90d"]).default("30d"),
  platform: platformEnum,
});

export const analyticsPostsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  fromDate: dateFormat,
  toDate: dateFormat,
  platform: platformEnum,
});

export const analyticsBestTimesQuerySchema = z.object({
  platform: platformEnum,
});

export const analyticsFollowersQuerySchema = z.object({
  platform: platformEnum,
});
