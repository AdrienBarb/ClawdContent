import { z } from "zod";

export const deletePostSchema = z.object({
  postId: z.string().min(1),
});

export const listPostsQuerySchema = z.object({
  status: z.enum(["draft", "scheduled", "published", "failed"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).optional(),
  sortBy: z.enum(["scheduled-desc", "scheduled-asc", "created-desc", "created-asc"]).optional(),
});

export const retryPostSchema = z.object({
  postId: z.string().min(1),
});

export const unpublishPostSchema = z.object({
  postId: z.string().min(1),
  platform: z.string().min(1),
});

export const updatePostSchema = z.object({
  postId: z.string().min(1),
  content: z.string().min(1).optional(),
  scheduledAt: z.string().optional(),
});
