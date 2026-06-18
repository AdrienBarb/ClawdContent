import { z } from "zod";
import { mediaItemsSchema } from "./mediaItems";

export const deletePostSchema = z.object({
  postId: z.string().min(1),
});

export const listPostsQuerySchema = z.object({
  status: z.enum(["draft", "scheduled", "published", "failed", "partial"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).optional(),
  sortBy: z.enum(["scheduled-desc", "scheduled-asc", "created-desc", "created-asc"]).optional(),
  platform: z.string().optional(),
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
  // Same Supabase-bucket allowlist as the suggestions PATCH route — editing a
  // committed post's visual must not be a weaker boundary than editing a draft
  // (blocks SSRF / pointing the publisher at an arbitrary URL).
  mediaItems: mediaItemsSchema.optional(),
});
