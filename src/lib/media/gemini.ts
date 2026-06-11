import "server-only";
import { GoogleGenAI } from "@google/genai";

/**
 * Single media provider: Google Gemini API (founder decision 2026-06-11).
 * One key, one SDK — images (Nano Banana Pro / Nano Banana 2) and video
 * (Veo 3.1 Fast) all run through this client.
 *
 * Model ids: the image models are GA ids (the `-preview` variants shut down
 * 2026-06-25 — never ship those). Veo 3.1 has no GA id yet; it's a paid
 * preview, so the id is pinned here and must be migrated when GA lands.
 */
export const NANO_BANANA_PRO = "gemini-3-pro-image"; // text cards, carousel slides, hero shots
export const NANO_BANANA_FLASH = "gemini-3.1-flash-image"; // photoreal, no on-image text
export const VEO_FAST = "veo-3.1-fast-generate-preview"; // 9:16 Reels (preview — plan GA migration)

let cached: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  if (!cached) {
    cached = new GoogleGenAI({ apiKey });
  }
  return cached;
}

function isRetryable(err: unknown): boolean {
  const status =
    typeof err === "object" && err !== null && "status" in err
      ? Number((err as { status?: unknown }).status)
      : NaN;
  if ([429, 500, 502, 503, 504].includes(status)) return true;
  const message = err instanceof Error ? err.message : String(err);
  return /\b(429|500|502|503|504|RESOURCE_EXHAUSTED|UNAVAILABLE|overloaded)\b/i.test(
    message
  );
}

/**
 * Exponential backoff with jitter for Gemini's peak-load 429/503s. Inngest
 * steps add their own outer retries; this inner loop just smooths transient
 * bursts so a step doesn't burn a whole retry on a 2-second blip.
 */
export async function withGeminiRetry<T>(
  label: string,
  fn: () => Promise<T>,
  { attempts = 3, baseDelayMs = 2000 }: { attempts?: number; baseDelayMs?: number } = {}
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isRetryable(err) || i === attempts - 1) throw err;
      const delay = baseDelayMs * 2 ** i * (0.75 + Math.random() * 0.5);
      console.warn(
        `[media:gemini] ${label} attempt ${i + 1}/${attempts} failed (retryable): ${err instanceof Error ? err.message : err}`
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}
