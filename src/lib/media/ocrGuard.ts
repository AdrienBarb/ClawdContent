import "server-only";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

/**
 * Mandatory day-1 text QA (founder decision 2026-06-11): Nano Banana trails
 * gpt-image on headline/price text accuracy by ~6-15%, so every text-bearing
 * render is transcribed and diffed against the intended copy. On mismatch the
 * caller regenerates that single asset (bounded retries).
 *
 * Transcription runs on Claude vision — already a project dependency, no new
 * OCR infra. The diff itself is plain code: normalized token containment,
 * with numeric tokens (prices, dates, phone numbers) required verbatim.
 */

const ocrSchema = z.object({
  transcribedText: z
    .string()
    .describe("Every piece of text visible in the image, in reading order."),
});

export async function transcribeImageText(image: Buffer): Promise<string> {
  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-6"),
    schema: ocrSchema,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", image },
          {
            type: "text",
            text: "Transcribe ALL text visible in this image exactly as rendered, including numbers, prices and punctuation. If there is no text, return an empty string.",
          },
        ],
      },
    ],
  });
  return object.transcribedText;
}

function normalize(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9€$£%\s]/g, " ")
      // Detach currency/percent symbols so "12€" and "12 €" tokenize the same.
      .replace(/[€$£%]/g, " $& ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

export interface TextMatchResult {
  ok: boolean;
  missingTokens: string[];
}

/**
 * Intended copy is satisfied when (a) every numeric token (price, date, time)
 * appears verbatim and (b) ≥90% of word tokens appear. Stray decorative text
 * in the render doesn't fail the check — only missing intended copy does.
 */
export function textMatches(
  intended: string,
  transcribed: string
): TextMatchResult {
  const haystack = ` ${normalize(transcribed)} `;
  // Keep ALL numeric tokens (a single-digit price or date matters as much as
  // a long one); only drop one-character word tokens.
  const tokens = normalize(intended)
    .split(" ")
    .filter((t) => t.length > 1 || /[\d€$£%]/.test(t));
  if (tokens.length === 0) return { ok: true, missingTokens: [] };

  const missing: string[] = [];
  let wordTotal = 0;
  let wordHit = 0;

  for (const token of tokens) {
    const isNumeric = /\d/.test(token);
    // Whole-token match only — a bare substring check would let "120" satisfy
    // an intended "12" (false PASS on a wrong price).
    const present = haystack.includes(` ${token} `);
    if (isNumeric) {
      if (!present) missing.push(token);
    } else {
      wordTotal += 1;
      if (present) wordHit += 1;
      else missing.push(token);
    }
  }

  const numericOk = !missing.some((t) => /\d/.test(t));
  const wordCoverage = wordTotal === 0 ? 1 : wordHit / wordTotal;
  return { ok: numericOk && wordCoverage >= 0.9, missingTokens: missing };
}

export interface VerifyImageTextResult {
  ok: boolean;
  transcribed: string;
  missingTokens: string[];
}

export async function verifyImageText(
  image: Buffer,
  intendedText: string
): Promise<VerifyImageTextResult> {
  const transcribed = await transcribeImageText(image);
  const match = textMatches(intendedText, transcribed);
  return { ok: match.ok, transcribed, missingTokens: match.missingTokens };
}
