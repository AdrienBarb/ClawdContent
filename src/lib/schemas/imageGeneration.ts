import { z } from "zod";

export const imageGenerateSchema = z.object({
  prompt: z.string().min(1).max(1000),
  size: z.enum(["1024x1024", "1792x1024", "1024x1792"]).default("1024x1024"),
});

export type ImageGenerateInput = z.infer<typeof imageGenerateSchema>;
