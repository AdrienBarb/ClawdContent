import "server-only";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { knowledgeBaseSchema, type KnowledgeBase } from "@/lib/schemas/knowledgeBase";

/**
 * Frozen per-user visual brand kit. Built once from knowledgeBase.branding and
 * re-injected verbatim into every image prompt — the style-anchor phrase plus
 * exact hex codes are what keep week-over-week media visually consistent
 * (regenerating the kit each week would drift the feed's look).
 */

export const styleKitSchema = z.object({
  version: z.literal(1),
  styleAnchor: z.string(),
  palette: z.array(z.string()).max(4),
  logoUrl: z.string().nullable(),
  referenceImageUrls: z.array(z.string()).max(2),
  builtAt: z.string(),
});

export type StyleKit = z.infer<typeof styleKitSchema>;

const HEX_RE = /^#?[0-9a-f]{3}([0-9a-f]{3})?$/i;

function pickPalette(colors: string[] | undefined): string[] {
  if (!colors) return [];
  return colors
    .filter((c) => HEX_RE.test(c.trim()))
    .map((c) => (c.startsWith("#") ? c : `#${c}`))
    .slice(0, 4);
}

export function buildStyleKitFromKnowledgeBase(kb: KnowledgeBase): StyleKit {
  const branding = kb.branding ?? null;
  const adjectives = (branding?.styleAdjectives ?? []).slice(0, 4);
  const palette = pickPalette(branding?.colors ?? undefined);

  const anchorParts: string[] = [];
  anchorParts.push(
    adjectives.length > 0
      ? `${adjectives.join(", ")} visual style`
      : "clean, modern, warm visual style"
  );
  if (branding?.voice?.tone) anchorParts.push(`tone: ${branding.voice.tone}`);
  if (palette.length > 0) {
    anchorParts.push(`brand colors ${palette.join(", ")}`);
  }
  anchorParts.push(
    `consistent social-media brand identity for ${kb.businessName}`
  );

  return {
    version: 1,
    styleAnchor: anchorParts.join("; "),
    palette,
    logoUrl: branding?.logoUrl ?? null,
    referenceImageUrls: (branding?.photoUrls ?? []).slice(0, 2),
    builtAt: new Date().toISOString(),
  };
}

/** Generic fallback when the user has no knowledgeBase branding at all. */
function genericStyleKit(): StyleKit {
  return {
    version: 1,
    styleAnchor:
      "clean, modern, warm visual style; consistent social-media brand identity",
    palette: [],
    logoUrl: null,
    referenceImageUrls: [],
    builtAt: new Date().toISOString(),
  };
}

export async function getOrBuildStyleKit(userId: string): Promise<StyleKit> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { styleKit: true, knowledgeBase: true },
  });
  if (!user) throw new Error(`User ${userId} not found`);

  const existing = styleKitSchema.safeParse(user.styleKit);
  if (existing.success) return existing.data;

  const kbParsed = knowledgeBaseSchema.safeParse(user.knowledgeBase);
  const kit = kbParsed.success
    ? buildStyleKitFromKnowledgeBase(kbParsed.data)
    : genericStyleKit();

  await prisma.user.update({
    where: { id: userId },
    data: { styleKit: kit as unknown as Prisma.InputJsonValue },
  });
  return kit;
}

/** Drop the cached kit so the next batch rebuilds from fresh branding. */
export async function invalidateStyleKit(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { styleKit: Prisma.JsonNull },
  });
}
