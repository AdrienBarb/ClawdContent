import "server-only";
import { prisma } from "@/lib/db/prisma";
import { buildUserPath, uploadBuffer } from "@/lib/supabase/storage";
import { NANO_BANANA_FLASH, NANO_BANANA_PRO } from "./gemini";
import {
  generateImage,
  fetchReferenceImage,
  type MediaAspectRatio,
  type ReferenceImage,
} from "./geminiImage";
import { resizeToExact, TARGET_DIMS } from "./imageSize";
import { verifyImageText } from "./ocrGuard";
import { generateVerifiedSlide, type CarouselSlideSpec } from "./carousel";
import { downloadReel } from "./geminiVideo";
import type { StyleKit } from "./styleKit";
import type { MediaItem } from "@/lib/schemas/mediaItems";

/**
 * Maps a planned post's format to the right generator and owns persistence:
 * every Gemini output is inline base64 / a short-lived URI, so each asset is
 * uploaded to Supabase (+ a Media row) inside the same call. Functions here
 * return URLs only — safe to cross Inngest step boundaries (4MB cap).
 *
 * Degradation (reel → static image → needs_media) is orchestrated by the
 * Inngest generate-week function, not here.
 */

export type PlannedMediaKind = "photo" | "text_card" | "carousel" | "reel" | "none";

export interface PostMediaPlan {
  kind: PlannedMediaKind;
  /** Scene description for photo / reel hero / text-card background. */
  imagePrompt?: string;
  /** Exact on-image copy for text cards. */
  headline?: string;
  body?: string;
  /** Carousel slides (2-6). */
  slides?: CarouselSlideSpec[];
  /** Motion description for the Reel (camera, action). */
  reelPrompt?: string;
}

async function persistImage({
  userId,
  batchId,
  data,
  aspectRatio,
}: {
  userId: string;
  batchId: string;
  data: Buffer;
  aspectRatio: MediaAspectRatio;
}): Promise<string> {
  const resized = await resizeToExact(data, aspectRatio);
  const path = buildUserPath(userId, { sub: `autopilot/${batchId}`, ext: "jpg" });
  const url = await uploadBuffer(path, resized.data, resized.mimeType);
  await prisma.media.create({
    data: {
      userId,
      storagePath: path,
      url,
      resourceType: "image",
      format: "jpg",
      bytes: resized.data.byteLength,
      width: resized.width,
      height: resized.height,
    },
  });
  return url;
}

async function styleReferences(kit: StyleKit): Promise<ReferenceImage[]> {
  const refs: ReferenceImage[] = [];
  for (const url of kit.referenceImageUrls.slice(0, 2)) {
    const ref = await fetchReferenceImage(url);
    if (ref) refs.push(ref);
  }
  return refs;
}

function photoPrompt(plan: PostMediaPlan, kit: StyleKit): string {
  return [
    `Photorealistic, high-quality social media photograph: ${plan.imagePrompt}.`,
    "Natural lighting, believable real-world scene, shot on a modern camera.",
    `Overall mood: ${kit.styleAnchor}.`,
    "STRICTLY NO text, NO captions, NO watermarks, NO logos in the image.",
  ].join("\n");
}

function textCardPrompt(plan: PostMediaPlan, kit: StyleKit): string {
  return [
    "Design a flat social-media graphic (not a photo).",
    `Render this headline EXACTLY, large and legible: "${plan.headline}".`,
    plan.body ? `Smaller supporting text, rendered EXACTLY: "${plan.body}".` : "",
    plan.imagePrompt ? `Background/visual theme: ${plan.imagePrompt}.` : "",
    kit.palette.length > 0
      ? `Use EXACTLY these brand colors: ${kit.palette.join(", ")}.`
      : "",
    kit.logoUrl ? "Place the provided logo small and unobtrusive in a corner." : "",
    `Style: ${kit.styleAnchor}.`,
    "No watermarks. No extra text beyond what is specified.",
  ]
    .filter(Boolean)
    .join("\n");
}

export interface StaticMediaResult {
  ok: boolean;
  mediaItems: MediaItem[];
  /** False when the OCR guard never passed (asset still produced). */
  textVerified: boolean;
  error?: string;
}

const MAX_TEXT_ATTEMPTS = 2;

/**
 * Render photo / text_card / carousel media for one post and persist it.
 * Throws only on unexpected infra errors; generation failures surface as
 * `ok: false` so the caller can degrade to needs_media.
 */
export async function renderStaticMedia({
  userId,
  batchId,
  plan,
  kit,
  aspectRatio = "4:5",
}: {
  userId: string;
  batchId: string;
  plan: PostMediaPlan;
  kit: StyleKit;
  aspectRatio?: MediaAspectRatio;
}): Promise<StaticMediaResult> {
  try {
    if (plan.kind === "photo") {
      const refs = await styleReferences(kit);
      const image = await generateImage({
        model: NANO_BANANA_FLASH,
        prompt: photoPrompt(plan, kit),
        aspectRatio,
        referenceImages: refs,
      });
      const url = await persistImage({ userId, batchId, data: image.data, aspectRatio });
      return { ok: true, mediaItems: [{ url, type: "image" }], textVerified: true };
    }

    if (plan.kind === "text_card") {
      const refs: ReferenceImage[] = [];
      if (kit.logoUrl) {
        const logo = await fetchReferenceImage(kit.logoUrl);
        if (logo) refs.push(logo);
      }
      const intended = [plan.headline, plan.body].filter(Boolean).join(" ");
      let lastData: Buffer | null = null;
      let verified = false;
      for (let attempt = 0; attempt < MAX_TEXT_ATTEMPTS; attempt++) {
        const image = await generateImage({
          model: NANO_BANANA_PRO,
          prompt:
            attempt === 0
              ? textCardPrompt(plan, kit)
              : `${textCardPrompt(plan, kit)}\nIMPORTANT: the previous render misspelled the text. Reproduce every word and number letter-perfect.`,
          aspectRatio,
          referenceImages: refs,
        });
        lastData = image.data;
        if (!intended) {
          verified = true;
          break;
        }
        const verdict = await verifyImageText(image.data, intended);
        if (verdict.ok) {
          verified = true;
          break;
        }
        console.warn(
          `[media:text_card] OCR mismatch attempt=${attempt + 1} missing=${verdict.missingTokens.join(",")}`
        );
      }
      const url = await persistImage({ userId, batchId, data: lastData!, aspectRatio });
      return { ok: true, mediaItems: [{ url, type: "image" }], textVerified: verified };
    }

    if (plan.kind === "carousel") {
      // 4-slide ceiling: the whole chain renders inside one Inngest step —
      // each slide is a generation + OCR round-trip against the duration cap.
      const slides = (plan.slides ?? []).slice(0, 4);
      if (slides.length < 2) {
        return { ok: false, mediaItems: [], textVerified: false, error: "carousel needs ≥2 slides" };
      }
      const mediaItems: MediaItem[] = [];
      let allVerified = true;
      let cover: Awaited<ReturnType<typeof generateVerifiedSlide>>["image"] | undefined;
      for (let i = 0; i < slides.length; i++) {
        const { image, textVerified } = await generateVerifiedSlide({
          spec: slides[i],
          kit,
          aspectRatio,
          cover: i === 0 ? undefined : cover,
          index: i,
        });
        if (i === 0) cover = image;
        allVerified = allVerified && textVerified;
        const url = await persistImage({ userId, batchId, data: image.data, aspectRatio });
        mediaItems.push({ url, type: "image" });
      }
      return { ok: true, mediaItems, textVerified: allVerified };
    }

    return { ok: false, mediaItems: [], textVerified: false, error: `unsupported kind ${plan.kind}` };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[media:render] ${plan.kind} failed: ${message}`);
    return { ok: false, mediaItems: [], textVerified: false, error: message };
  }
}

/**
 * Generate + persist the Reel's hero frame (9:16 still that seeds Veo
 * image-to-video and doubles as the static-image fallback if video fails).
 */
export async function renderReelHero({
  userId,
  batchId,
  plan,
  kit,
}: {
  userId: string;
  batchId: string;
  plan: PostMediaPlan;
  kit: StyleKit;
}): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    const refs = await styleReferences(kit);
    const image = await generateImage({
      model: NANO_BANANA_FLASH,
      prompt: photoPrompt(plan, kit),
      aspectRatio: "9:16",
      referenceImages: refs,
    });
    const url = await persistImage({
      userId,
      batchId,
      data: image.data,
      aspectRatio: "9:16",
    });
    return { ok: true, url };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[media:reel-hero] failed: ${message}`);
    return { ok: false, error: message };
  }
}

/** Download the finished Veo MP4 and persist it to Supabase (+ Media row). */
export async function persistReelVideo({
  userId,
  batchId,
  videoUri,
}: {
  userId: string;
  batchId: string;
  videoUri: string;
}): Promise<{ url: string }> {
  const video = await downloadReel(videoUri);
  const path = buildUserPath(userId, { sub: `autopilot/${batchId}`, ext: "mp4" });
  const url = await uploadBuffer(path, video, "video/mp4");
  const dims = TARGET_DIMS["9:16"];
  await prisma.media.create({
    data: {
      userId,
      storagePath: path,
      url,
      resourceType: "video",
      format: "mp4",
      bytes: video.byteLength,
      width: dims.width,
      height: dims.height,
    },
  });
  return { url };
}
