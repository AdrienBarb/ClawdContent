import { z } from "zod";

export const analyticsQuerySchema = z.object({
  period: z.enum(["7d", "30d", "90d"]).default("30d"),
  platform: z.string().optional(),
});

export const analyticsPostsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});

export const analyticsBestTimesQuerySchema = z.object({
  platform: z.string().optional(),
});

export const analyticsFollowersQuerySchema = z.object({
  platform: z.string().optional(),
});
