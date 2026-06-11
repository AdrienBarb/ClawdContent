import { z } from "zod";

/**
 * Brand identity extracted from the user's website (Firecrawl `branding`
 * format) plus verbal identity inferred by the model from the page copy.
 *
 * Every field is optional and fully user-editable: a description-only
 * onboarding has no visual tokens, and sparse small-business sites often miss
 * colours/logo/fonts. The branding editor lets the user add/remove anything.
 *
 * `colors` and `fonts` are flat, editable lists. Legacy stored rows used keyed
 * objects (`{primary, secondary, …}` / `{heading, body}`); the preprocessors
 * below normalise those into arrays so old `knowledgeBase` JSON still parses.
 */

function uniqStrings(values: unknown[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    if (typeof v !== "string") continue;
    const trimmed = v.trim();
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

const LEGACY_COLOR_ORDER = [
  "primary",
  "secondary",
  "accent",
  "background",
  "text",
] as const;

const colorsField = z.preprocess((val) => {
  if (Array.isArray(val)) return uniqStrings(val);
  if (val && typeof val === "object") {
    const obj = val as Record<string, unknown>;
    return uniqStrings(LEGACY_COLOR_ORDER.map((k) => obj[k]));
  }
  return val;
}, z.array(z.string()).optional());

const fontsField = z.preprocess((val) => {
  if (Array.isArray(val)) return uniqStrings(val);
  if (val && typeof val === "object") {
    const obj = val as Record<string, unknown>;
    return uniqStrings([obj.heading, obj.body]);
  }
  return val;
}, z.array(z.string()).optional());

export const brandingSchema = z.object({
  /** Brand colour palette — hex/rgb/hsl strings the user can add/remove. */
  colors: colorsField,
  /** Brand fonts — names picked from a curated list. */
  fonts: fontsField,
  logoUrl: z.string().nullable().optional(),
  faviconUrl: z.string().nullable().optional(),
  voice: z
    .object({
      /** Short natural-language summary of the brand's tone of voice. */
      tone: z.string().optional(),
      /** Energy level — usually "low" | "medium" | "high". */
      energy: z.string().optional(),
      /** Who the brand speaks to. */
      audience: z.string().optional(),
    })
    .optional(),
  styleAdjectives: z.array(z.string()).optional(),
  tagline: z.string().optional(),
  /** Optional brand photos (Supabase URLs) used as style references for generated media. */
  photoUrls: z.array(z.string()).optional(),
});

export type Branding = z.infer<typeof brandingSchema>;

export const knowledgeBaseSchema = z.object({
  businessName: z.string(),
  description: z.string(),
  services: z.array(z.string()),
  source: z.enum(["website", "manual", "legacy"]),
  branding: brandingSchema.nullable().optional(),
});

export type KnowledgeBase = z.infer<typeof knowledgeBaseSchema>;

/**
 * Shape the analysis model produces. Visual branding (colours, logo, fonts)
 * comes from Firecrawl, NOT the model — so we ask the model only for the
 * business facts plus the verbal brand identity it can infer from page copy.
 *
 * Claude-safe: no `minItems` / `maxItems` on arrays (Anthropic `generateObject`
 * rejects them). We trim `styleAdjectives` in code. See CLAUDE.md gotchas.
 */
export const analyzeLLMSchema = z.object({
  businessName: z.string(),
  description: z.string(),
  services: z.array(z.string()),
  /** A 1-sentence description of the brand's tone of voice. */
  brandVoice: z.string(),
  /** 3-5 adjectives describing the brand's overall style. */
  styleAdjectives: z.array(z.string()),
  /** The brand's tagline / slogan. Empty string if none is evident. */
  tagline: z.string(),
});

export type AnalyzeLLMOutput = z.infer<typeof analyzeLLMSchema>;

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
