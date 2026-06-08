import type { BrandingProfile, DocumentMetadata } from "@mendable/firecrawl-js";
import type { AnalyzeLLMOutput, Branding } from "@/lib/schemas/knowledgeBase";

const MAX_STYLE_ADJECTIVES = 5;
const MAX_COLORS = 8;
const MAX_FONTS = 4;

// CSS-wide keywords and non-colour tokens that pass an /^[a-z]+$/ test but
// render as no/invalid swatch. Reject them so we never store a bogus colour.
const NON_COLOR_KEYWORDS = new Set([
  "inherit",
  "initial",
  "unset",
  "revert",
  "currentcolor",
  "transparent",
  "auto",
  "none",
]);

/** Keep a colour value only if it reads as a CSS colour we can render. */
function cleanColor(value?: string): string | undefined {
  if (!value) return undefined;
  const v = value.trim();
  if (!v) return undefined;
  // hex, rgb()/rgba(), hsl()/hsla(), or a bare named colour
  if (/^#([0-9a-f]{3,8})$/i.test(v)) return v.toLowerCase();
  if (/^(rgb|hsl)a?\(/i.test(v)) return v;
  if (/^[a-z]+$/i.test(v)) {
    const lower = v.toLowerCase();
    return NON_COLOR_KEYWORDS.has(lower) ? undefined : lower;
  }
  return undefined;
}

function firstString(...values: (string | undefined)[]): string | undefined {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

// Logos/favicons are stored inline in the knowledgeBase JSON. Keep http(s)
// URLs, and only keep small inline data URIs (e.g. a tiny SVG) — drop large
// base64 blobs so we don't bloat the row.
const MAX_DATA_URI_LENGTH = 2000;
function cleanImageUrl(...values: (string | undefined | null)[]): string | undefined {
  for (const raw of values) {
    if (typeof raw !== "string") continue;
    const v = raw.trim();
    if (!v) continue;
    if (/^https?:\/\//i.test(v)) return v;
    if (v.startsWith("data:") && v.length <= MAX_DATA_URI_LENGTH) return v;
  }
  return undefined;
}

function dedupeTrim(values: (string | undefined | null)[], max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    if (!v) continue;
    const trimmed = v.trim();
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
    if (out.length >= max) break;
  }
  return out;
}

/**
 * The visual + personality slice we pull straight from Firecrawl's branding
 * profile (with metadata as a fallback for logo/favicon). The verbal slice
 * (tone summary, tagline, style adjectives) comes from the analysis model and
 * is fused in `mergeBranding`.
 *
 * Colours and fonts are flat lists (the editable shape) — Firecrawl's keyed
 * roles are flattened in order, deduped.
 */
export interface FirecrawlVisualBranding {
  colors?: string[];
  fonts?: string[];
  logoUrl?: string | null;
  faviconUrl?: string | null;
  /** Personality tone enum (e.g. "playful") — used to seed style adjectives. */
  personalityTone?: string;
  energy?: string;
  audience?: string;
}

export function mapFirecrawlBranding(
  branding?: BrandingProfile,
  metadata?: DocumentMetadata
): FirecrawlVisualBranding {
  if (!branding && !metadata) return {};

  const c = branding?.colors;
  const colors = dedupeTrim(
    [
      cleanColor(c?.primary),
      cleanColor(c?.secondary),
      cleanColor(c?.accent),
      cleanColor(c?.background),
      cleanColor(c?.textPrimary),
    ],
    MAX_COLORS
  );

  const typo = branding?.typography;
  const headingFont = firstString(
    typo?.fontFamilies?.heading,
    typo?.fontStacks?.heading?.[0],
    branding?.fonts?.[0]?.family
  );
  const bodyFont = firstString(
    typo?.fontFamilies?.primary,
    typo?.fontStacks?.body?.[0],
    typo?.fontStacks?.primary?.[0],
    branding?.fonts?.[0]?.family
  );
  const fonts = dedupeTrim([headingFont, bodyFont], MAX_FONTS);

  // Only use values Firecrawl identifies as the logo. metadata.ogImage is the
  // social-share image (usually a hero/product shot, not the mark), so we do
  // NOT fall back to it — better no logo than a wrong one shown under "Logo".
  const logoUrl = cleanImageUrl(branding?.logo, branding?.images?.logo) ?? null;
  const faviconUrl =
    cleanImageUrl(branding?.images?.favicon, metadata?.favicon) ?? null;

  return {
    colors: colors.length > 0 ? colors : undefined,
    fonts: fonts.length > 0 ? fonts : undefined,
    logoUrl,
    faviconUrl,
    personalityTone: branding?.personality?.tone,
    energy: branding?.personality?.energy,
    audience: firstString(branding?.personality?.targetAudience),
  };
}

/**
 * Fuse Firecrawl's visual/personality tokens with the model's verbal output
 * into the stored `Branding` shape. Returns `null` only when there's genuinely
 * nothing to store (no visual tokens and no verbal signal).
 */
export function mergeBranding(
  visual: FirecrawlVisualBranding,
  llm: AnalyzeLLMOutput
): Branding | null {
  const styleAdjectives = dedupeTrim(
    [...(llm.styleAdjectives ?? []), visual.personalityTone],
    MAX_STYLE_ADJECTIVES
  );

  const voice = {
    tone: firstString(llm.brandVoice),
    energy: firstString(visual.energy),
    audience: firstString(visual.audience),
  };
  const hasVoice = voice.tone || voice.energy || voice.audience;

  const branding: Branding = {
    colors: visual.colors,
    fonts: visual.fonts,
    logoUrl: visual.logoUrl ?? null,
    faviconUrl: visual.faviconUrl ?? null,
    voice: hasVoice ? voice : undefined,
    styleAdjectives: styleAdjectives.length > 0 ? styleAdjectives : undefined,
    tagline: firstString(llm.tagline),
  };

  const hasAnything =
    (branding.colors && branding.colors.length > 0) ||
    (branding.fonts && branding.fonts.length > 0) ||
    branding.logoUrl ||
    branding.faviconUrl ||
    branding.voice ||
    branding.styleAdjectives ||
    branding.tagline;

  return hasAnything ? branding : null;
}
