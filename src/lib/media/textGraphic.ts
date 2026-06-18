import "server-only";
import type { StyleKit } from "./styleKit";

/**
 * Shared building blocks for the flat, text-bearing graphics (standalone text
 * cards + carousel covers). Both render exact on-image copy via Nano Banana Pro
 * and pass the OCR guard, so the prompt skeleton, the regenerate-on-mismatch
 * suffix, and the attempt cap live here once instead of being duplicated across
 * `mediaPlan.ts` and `carousel.ts`.
 */

/** Bounded OCR-guard retries for any text-bearing render. */
export const MAX_TEXT_ATTEMPTS = 2;

/**
 * Appended to a text-graphic prompt on the retry after the OCR guard fails, so
 * the model knows the previous render misspelled the copy. Starts with a
 * newline so it concatenates directly onto the base prompt.
 */
export const OCR_RETRY_SUFFIX =
  "\nIMPORTANT: the previous render misspelled the text. Reproduce every word and number letter-perfect.";

export function paletteLine(kit: StyleKit): string {
  return kit.palette.length > 0
    ? `Use EXACTLY these brand colors: ${kit.palette.join(", ")}.`
    : "Use a cohesive, tasteful color palette.";
}

/**
 * Build a flat (non-photo) social graphic prompt that renders exact on-image
 * copy. `intro` declares what kind of graphic it is (a standalone card vs a
 * carousel cover); `backgroundTheme` is an optional scene/visual hint.
 */
export function buildTextGraphicPrompt({
  intro,
  headline,
  body,
  backgroundTheme,
  kit,
}: {
  intro: string;
  headline: string;
  body?: string;
  backgroundTheme?: string;
  kit: StyleKit;
}): string {
  return [
    intro,
    `Render this headline EXACTLY, large and legible: "${headline}".`,
    body ? `Smaller supporting text, rendered EXACTLY: "${body}".` : "",
    backgroundTheme ? `Background/visual theme: ${backgroundTheme}.` : "",
    paletteLine(kit),
    kit.logoUrl ? "Place the provided logo small and unobtrusive in a corner." : "",
    `Style: ${kit.styleAnchor}.`,
    "No watermarks. No extra text beyond what is specified.",
  ]
    .filter(Boolean)
    .join("\n");
}
