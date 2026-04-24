import { z } from "zod";

export const knowledgeBaseSchema = z.object({
  businessName: z.string(),
  description: z.string(),
  services: z.array(z.string()),
  source: z.enum(["website", "manual", "legacy"]),
});

export type KnowledgeBase = z.infer<typeof knowledgeBaseSchema>;

export const analyzeInputSchema = z
  .object({
    websiteUrl: z.string().url().optional(),
    businessDescription: z.string().max(1000).optional(),
  })
  .refine((data) => data.websiteUrl || data.businessDescription, {
    message: "Please provide a website URL or a business description",
  });

export const confirmInputSchema = z.object({
  websiteUrl: z.string().url().optional(),
  businessDescription: z.string().max(1000).optional(),
  knowledgeBase: knowledgeBaseSchema,
});
