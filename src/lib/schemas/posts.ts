import { z } from "zod";

export const deletePostSchema = z.object({
  postId: z.string().min(1),
});

export const listPostsQuerySchema = z.object({
  status: z.enum(["scheduled", "published", "failed"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).optional(),
  sortBy: z
    .enum([
      "scheduled-desc",
      "scheduled-asc",
      "created-desc",
      "created-asc",
      "status",
      "platform",
    ])
    .optional(),
});

export const reschedulePostSchema = z.object({
  postId: z.string().min(1),
  scheduledFor: z.string().min(1, "Scheduled time is required"),
});

export const unpublishPostSchema = z.object({
  postId: z.string().min(1),
  platform: z.string().min(1, "Platform is required"),
});
