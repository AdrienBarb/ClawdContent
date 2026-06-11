import "server-only";
import sharp from "sharp";
import type { MediaAspectRatio } from "./geminiImage";

/**
 * Gemini lets us pick an aspect ratio + resolution tier (1K/2K/4K) but not
 * arbitrary pixel dims — and 1080 isn't a multiple of what the tiers produce.
 * So every asset goes through ONE deterministic cover-resize to land exactly
 * on Instagram/Facebook's expected dimensions before Zernio sees it.
 */
export const TARGET_DIMS: Record<
  MediaAspectRatio,
  { width: number; height: number }
> = {
  "1:1": { width: 1080, height: 1080 },
  "4:5": { width: 1080, height: 1350 },
  "9:16": { width: 1080, height: 1920 },
};

export interface ResizedImage {
  data: Buffer;
  mimeType: "image/jpeg";
  width: number;
  height: number;
}

export async function resizeToExact(
  input: Buffer,
  aspectRatio: MediaAspectRatio
): Promise<ResizedImage> {
  const { width, height } = TARGET_DIMS[aspectRatio];
  const data = await sharp(input)
    .resize(width, height, { fit: "cover", position: "centre" })
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();
  return { data, mimeType: "image/jpeg", width, height };
}
