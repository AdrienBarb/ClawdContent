import { z } from "zod";
import type { MediaItem } from "@/lib/schemas/mediaItems";

/**
 * Single-post compose output. Anthropic's `generateObject` rejects min/max on
 * arrays — this schema has none (a single object with optional string fields).
 */
export const composePostClaudeSchema = z.object({
  content: z.string(),
  reasoning: z.string(),
  format: z.enum(["photo", "text_card", "text"]),
  media: z.object({
    imagePrompt: z.string().optional(),
    headline: z.string().optional(),
    body: z.string().optional(),
  }),
});

export type ComposeFormat = "photo" | "text_card" | "text";
export type ComposePostOutput = z.infer<typeof composePostClaudeSchema>;

/**
 * Bounds the media plan the client echoes back to /regenerate-image. The plan
 * fields are interpolated into the image-generation prompt, so length-cap them
 * and restrict the kind to the two formats /explore actually produces — an
 * unbounded `unknown` would be a prompt-injection + cost-amplification surface.
 */
export const composeMediaPlanSchema = z.object({
  kind: z.enum(["photo", "text_card"]),
  imagePrompt: z.string().max(4000).optional(),
  headline: z.string().max(500).optional(),
  body: z.string().max(1000).optional(),
});

/**
 * The ephemeral post returned to the /explore client. No DB row exists yet —
 * this lives only in client state until the user posts or schedules it.
 */
export interface ComposePostResponse {
  accountId: string;
  platform: string;
  username: string;
  content: string;
  contentType: "image" | "text";
  mediaItems: MediaItem[];
  /** Opaque media plan echoed back to /regenerate-image to keep the same concept. */
  mediaPlan: unknown;
  /** Whether the platform refuses caption-only posts (Instagram). */
  requiresMedia: boolean;
  /** ISO — the next best posting slot, prefilled into the schedule picker. */
  suggestedScheduledAt: string | null;
}
