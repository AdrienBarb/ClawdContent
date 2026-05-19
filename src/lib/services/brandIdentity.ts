import { prisma } from "@/lib/db/prisma";
import type { BrandingProfile } from "@mendable/firecrawl-js";
import {
  brandIdentitySchema,
  type BrandIdentity,
} from "@/lib/schemas/brandIdentity";

const HEX = /^#[0-9a-fA-F]{6}$/;

function normalizeHex(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (HEX.test(trimmed)) return trimmed.toLowerCase();
  // Some scrapers return 3-digit hex; expand to 6 digits.
  const short = /^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/.exec(trimmed);
  if (short) {
    const [, r, g, b] = short;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return null;
}

function describeStyleNotes(branding: BrandingProfile): string | null {
  const parts: string[] = [];
  if (branding.colorScheme) parts.push(`${branding.colorScheme} mode`);
  const primaryFont = branding.typography?.fontFamilies?.heading ??
    branding.typography?.fontFamilies?.primary ??
    branding.fonts?.[0]?.family;
  if (primaryFont) parts.push(`headings in ${primaryFont}`);
  return parts.length > 0 ? parts.join(", ") : null;
}

export function extractBrandIdentityFromScrape(scrape: {
  branding?: BrandingProfile;
  images?: string[];
}): BrandIdentity | null {
  const branding = scrape.branding;
  if (!branding) return null;

  const primary = normalizeHex(branding.colors?.primary);
  const secondary = normalizeHex(branding.colors?.secondary);
  const accent = normalizeHex(branding.colors?.accent);

  // Need at least primary + secondary to call this a usable extraction.
  if (!primary || !secondary) return null;

  const logoUrl = branding.logo ?? null;
  const photos = (scrape.images ?? []).slice(0, 5);

  const candidate: BrandIdentity = {
    logoUrl,
    primaryColor: primary,
    secondaryColor: secondary,
    accentColor: accent,
    brandPhotos: photos,
    styleNotes: describeStyleNotes(branding),
  };

  const parsed = brandIdentitySchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

export async function saveBrandIdentity(
  userId: string,
  brandIdentity: BrandIdentity
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { brandIdentity },
  });
}

export function formatBrandIdentityForPrompt(
  brandIdentity: unknown
): string | null {
  if (!brandIdentity || typeof brandIdentity !== "object") return null;
  const parsed = brandIdentitySchema.safeParse(brandIdentity);
  if (!parsed.success) return null;

  const bi = parsed.data;
  const lines: string[] = [];
  lines.push(`Primary color: ${bi.primaryColor}`);
  lines.push(`Secondary color: ${bi.secondaryColor}`);
  if (bi.accentColor) lines.push(`Accent color: ${bi.accentColor}`);
  if (bi.styleNotes) lines.push(`Style: ${bi.styleNotes}`);
  return lines.join("\n");
}
