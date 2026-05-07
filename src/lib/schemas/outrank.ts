import { z } from "zod";

// Caps protect jsdom + Sanity from runaway memory on adversarial payloads.
const MAX_TITLE = 300;
const MAX_SLUG = 200;
const MAX_DESCRIPTION = 600;
const MAX_HTML = 500_000; // ~500KB of HTML covers any realistic article.
const MAX_TAGS = 30;
const MAX_TAG = 80;

export const OutrankArticleSchema = z.object({
  id: z.string().min(1).max(200),
  title: z.string().min(1).max(MAX_TITLE),
  content_markdown: z.string().max(MAX_HTML).optional().default(""),
  content_html: z.string().min(1).max(MAX_HTML),
  meta_description: z.string().max(MAX_DESCRIPTION).optional().default(""),
  created_at: z.string().min(1),
  image_url: z.string().url().optional(),
  slug: z
    .string()
    .min(1)
    .max(MAX_SLUG)
    .regex(/^[a-z0-9-]+$/, "slug must be lowercase kebab-case"),
  tags: z.array(z.string().max(MAX_TAG)).max(MAX_TAGS).default([]),
});

// Cap batch size at the schema boundary — webhook handler then enforces this.
export const MAX_ARTICLES_PER_REQUEST = 50;

export const OutrankWebhookSchema = z.object({
  event_type: z.string(),
  timestamp: z.string(),
  data: z.object({
    articles: z.array(OutrankArticleSchema).max(MAX_ARTICLES_PER_REQUEST),
  }),
});

export type OutrankArticle = z.infer<typeof OutrankArticleSchema>;
export type OutrankWebhook = z.infer<typeof OutrankWebhookSchema>;
