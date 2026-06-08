import { z } from "zod";

// Allow only URLs served from OUR Supabase Storage project, public `media`
// bucket. This is a security boundary (chat attachments + post media flow
// through it) — it blocks SSRF / pointing the publisher at arbitrary URLs.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUBLIC_PREFIX = "/storage/v1/object/public/media/";

function supabaseHost(): string | null {
  if (!SUPABASE_URL) return null;
  try {
    return new URL(SUPABASE_URL).host;
  } catch {
    return null;
  }
}

const storageUrlSchema = z
  .string()
  .url()
  .refine(
    (raw) => {
      try {
        const host = supabaseHost();
        // Fail-closed: with no configured host, reject every URL rather than
        // silently accepting media from other origins.
        if (!host) return false;
        const u = new URL(raw);
        const isLocal =
          u.hostname === "127.0.0.1" || u.hostname === "localhost";
        // HTTPS everywhere, except http on the local dev stack.
        if (u.protocol !== "https:" && !(isLocal && u.protocol === "http:")) {
          return false;
        }
        if (u.host !== host) return false;
        if (!u.pathname.startsWith(PUBLIC_PREFIX)) return false;
        return true;
      } catch {
        return false;
      }
    },
    { message: "Media URL must point to our media storage" }
  );

export const mediaItemSchema = z.object({
  url: storageUrlSchema,
  type: z.enum(["image", "video"]),
});

// Hard ceiling matches the largest carousel any platform accepts (TikTok = 35).
// Per-platform tightening happens in mediaValidation.ts.
export const mediaItemsSchema = z.array(mediaItemSchema).max(35);

export type MediaItem = z.infer<typeof mediaItemSchema>;

// Cap for images attached to a chat message. Bounds vision-token cost and
// matches the smallest carousel limit across our supported platforms.
export const MAX_CHAT_ATTACHMENTS = 4;

export function coerceMediaItems(json: unknown): MediaItem[] {
  if (json === null || json === undefined) return [];
  const parsed = mediaItemsSchema.safeParse(json);
  if (!parsed.success) {
    console.warn(
      "[mediaItems] coerce failed — returning empty array",
      parsed.error.flatten()
    );
    return [];
  }
  return parsed.data;
}
