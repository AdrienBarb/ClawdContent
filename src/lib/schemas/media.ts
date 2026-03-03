import { z } from "zod";

export const mediaUploadSchema = z.object({
  cloudinaryId: z.string().min(1),
  url: z.string().url(),
  resourceType: z.enum(["image", "video"]),
  format: z.string().min(1),
  bytes: z.number().int().positive(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

export type MediaUploadInput = z.infer<typeof mediaUploadSchema>;
