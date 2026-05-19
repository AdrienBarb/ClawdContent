import { z } from "zod";

/** Same scheme allowlist as brandIdentity — `.url()` alone accepts
 * `javascript:`/`data:`/`file:` which we do not want anywhere near
 * Firecrawl or Prisma. */
const safeHttpUrl = z
  .string()
  .url()
  .max(2048)
  .refine(
    (value) => {
      try {
        const protocol = new URL(value).protocol;
        return protocol === "https:" || protocol === "http:";
      } catch {
        return false;
      }
    },
    { message: "Only http(s) URLs are allowed" }
  );

export const knowledgeBaseSchema = z.object({
  businessName: z.string(),
  description: z.string(),
  services: z.array(z.string()),
  source: z.enum(["website", "manual", "legacy"]),
});

export type KnowledgeBase = z.infer<typeof knowledgeBaseSchema>;

export const analyzeInputSchema = z
  .object({
    websiteUrl: safeHttpUrl.optional(),
    businessDescription: z.string().max(1000).optional(),
  })
  .refine((data) => data.websiteUrl || data.businessDescription, {
    message: "Please provide a website URL or a business description",
  });

export const confirmInputSchema = z.object({
  websiteUrl: safeHttpUrl.optional(),
  businessDescription: z.string().max(1000).optional(),
  knowledgeBase: knowledgeBaseSchema,
});
