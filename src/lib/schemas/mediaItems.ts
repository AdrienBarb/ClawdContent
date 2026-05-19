import { z } from "zod";

const CLOUDINARY_HOSTNAME = "res.cloudinary.com";
const CLOUDINARY_CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

const cloudinaryUrlSchema = z
  .string()
  .url()
  .refine(
    (raw) => {
      try {
        const u = new URL(raw);
        if (u.protocol !== "https:") return false;
        if (u.hostname !== CLOUDINARY_HOSTNAME) return false;
        // Fail-closed: if the cloud name env var is missing, reject every URL
        // rather than silently accepting URLs from other tenants.
        if (!CLOUDINARY_CLOUD) return false;
        if (!u.pathname.startsWith(`/${CLOUDINARY_CLOUD}/`)) return false;
        return true;
      } catch {
        return false;
      }
    },
    { message: "Media URL must point to Cloudinary over HTTPS" }
  );

export const mediaItemSchema = z.object({
  url: cloudinaryUrlSchema,
  type: z.enum(["image", "video"]),
});

// Hard ceiling matches the largest carousel any platform accepts (TikTok = 35).
// Per-platform tightening happens in mediaValidation.ts.
export const mediaItemsSchema = z.array(mediaItemSchema).max(35);

export type MediaItem = z.infer<typeof mediaItemSchema>;

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
