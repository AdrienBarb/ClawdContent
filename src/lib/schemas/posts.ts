import { z } from "zod";
import { mediaItemsSchema } from "@/lib/schemas/mediaItems";

export const deletePostSchema = z.object({
  postId: z.string().min(1),
});

/**
 * PATCH /api/posts/[id] — edits a PostSuggestion draft (caption, schedule,
 * media). All fields optional; at least one must be provided. `scheduledAt`
 * accepts an ISO string for future-dated schedules, or null to clear.
 */
export const updatePostSuggestionSchema = z
  .object({
    content: z.string().trim().min(1).max(10000).optional(),
    mediaItems: mediaItemsSchema.optional(),
    suggestedDay: z.number().int().min(0).max(6).optional(),
    suggestedHour: z.number().int().min(0).max(23).optional(),
    scheduledAt: z.union([z.string().datetime(), z.null()]).optional(),
  })
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one field must be provided"
  );

export type UpdatePostSuggestionInput = z.infer<typeof updatePostSuggestionSchema>;

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
  mediaItems: z.array(z.object({ url: z.string(), type: z.string() })).optional(),
});
