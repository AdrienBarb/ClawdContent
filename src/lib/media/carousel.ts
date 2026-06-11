import "server-only";
import {
  generateImage,
  fetchReferenceImage,
  type GeneratedImage,
  type MediaAspectRatio,
  type ReferenceImage,
} from "./geminiImage";
import { NANO_BANANA_PRO } from "./gemini";
import { verifyImageText } from "./ocrGuard";
import type { StyleKit } from "./styleKit";

/**
 * Carousel = chained generation, no atomic deck call exists on any provider.
 * Anti-drift recipe (verified research 2026-06-11):
 *   1. Slide 1 (cover) is the style anchor — generated with logo + palette +
 *      style-anchor phrase.
 *   2. Slides 2..N re-anchor EVERY slide to the COVER (never slide→slide —
 *      cumulative chaining drifts the palette past ~7-8 generations), passing
 *      the cover as a style/layout reference and changing only that slide's
 *      headline/subject.
 *   3. One aspect ratio for the whole set; every slide is OCR-verified.
 */

export interface CarouselSlideSpec {
  headline: string;
  body?: string;
}

function paletteLine(kit: StyleKit): string {
  return kit.palette.length > 0
    ? `Use EXACTLY these brand colors: ${kit.palette.join(", ")}.`
    : "Use a cohesive, tasteful color palette.";
}

export function buildCoverPrompt(
  slide: CarouselSlideSpec,
  kit: StyleKit
): string {
  return [
    `Design the COVER slide of a social-media carousel (flat graphic design, not a photo).`,
    `Render this headline EXACTLY, large and legible: "${slide.headline}".`,
    slide.body ? `Smaller supporting text, rendered EXACTLY: "${slide.body}".` : "",
    paletteLine(kit),
    kit.logoUrl ? "Place the provided logo small and unobtrusive in a corner." : "",
    `Style: ${kit.styleAnchor}.`,
    "No watermarks. No extra text beyond what is specified.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildSlidePrompt(
  slide: CarouselSlideSpec,
  kit: StyleKit,
  index: number
): string {
  return [
    `Design slide ${index + 1} of the SAME social-media carousel as the reference image.`,
    "Match the reference image's layout system, typography, background treatment and color palette EXACTLY — it is the cover of this carousel.",
    `Change only the text. Render this headline EXACTLY: "${slide.headline}".`,
    slide.body ? `Smaller supporting text, rendered EXACTLY: "${slide.body}".` : "",
    paletteLine(kit),
    `Style: ${kit.styleAnchor}.`,
    "No watermarks. No extra text beyond what is specified.",
  ]
    .filter(Boolean)
    .join("\n");
}

const MAX_TEXT_ATTEMPTS = 2;

/**
 * Generate one slide with the OCR guard: render → transcribe → diff against
 * the intended copy → regenerate once on mismatch. Returns the last render
 * even if the guard still fails (caller decides whether to degrade) plus the
 * guard verdict.
 */
export async function generateVerifiedSlide({
  spec,
  kit,
  aspectRatio,
  cover,
  index,
}: {
  spec: CarouselSlideSpec;
  kit: StyleKit;
  aspectRatio: MediaAspectRatio;
  /** Cover render — required for every slide after the first. */
  cover?: GeneratedImage;
  index: number;
}): Promise<{ image: GeneratedImage; textVerified: boolean }> {
  const references: ReferenceImage[] = [];
  if (cover) {
    references.push({
      data: cover.data.toString("base64"),
      mimeType: cover.mimeType,
    });
  }
  if (kit.logoUrl) {
    const logo = await fetchReferenceImage(kit.logoUrl);
    if (logo) references.push(logo);
  }

  const intendedText = [spec.headline, spec.body].filter(Boolean).join(" ");
  const prompt =
    index === 0 ? buildCoverPrompt(spec, kit) : buildSlidePrompt(spec, kit, index);

  let last: GeneratedImage | null = null;
  for (let attempt = 0; attempt < MAX_TEXT_ATTEMPTS; attempt++) {
    last = await generateImage({
      model: NANO_BANANA_PRO,
      prompt:
        attempt === 0
          ? prompt
          : `${prompt}\nIMPORTANT: the previous render misspelled the text. Reproduce every word and number letter-perfect.`,
      aspectRatio,
      referenceImages: references,
    });
    const verdict = await verifyImageText(last.data, intendedText);
    if (verdict.ok) return { image: last, textVerified: true };
    console.warn(
      `[media:carousel] OCR mismatch slide=${index} attempt=${attempt + 1} missing=${verdict.missingTokens.join(",")}`
    );
  }
  return { image: last!, textVerified: false };
}
