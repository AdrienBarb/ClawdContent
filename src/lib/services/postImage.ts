import "server-only";
import { prisma } from "@/lib/db/prisma";
import { generateImage } from "@/lib/ai/generateImage";
import { uploadBase64Image } from "@/lib/cloudinary/upload";
import {
  brandIdentitySchema,
  type BrandIdentity,
} from "@/lib/schemas/brandIdentity";
import { strategySchema } from "@/lib/schemas/strategy";
import { coerceMediaItems } from "@/lib/schemas/mediaItems";
import type { Prisma } from "@prisma/client";

// gpt-image-1 returns base64-encoded bytes. 1024x1536 PNG at high quality
// can run ~4MB → ~5.5MB base64. Cap at 15MB base64 (~11MB raw) — anything
// larger means the upstream response is malformed and we shouldn't push
// it to Cloudinary.
const MAX_BASE64_BYTES = 15 * 1024 * 1024;

/**
 * Platforms that REQUIRE a generated image for every post per spec D14
 * (Instagram / Facebook / Pinterest). The remaining text-friendly platforms
 * (Twitter, LinkedIn, Threads, Bluesky) can publish text-only and don't
 * need to burn an image-gen credit on every post.
 *
 * NOTE: Facebook is in this set even though `platformConfig.requiresMedia`
 * is null for FB — the spec explicitly groups it with IG and Pinterest.
 */
export const IMAGE_REQUIRED_PLATFORMS = new Set([
  "instagram",
  "facebook",
  "pinterest",
]);

/** Default per-user weekly image generation cap (spec Phase 5). */
export const DEFAULT_WEEKLY_IMAGE_CAP = 50;

export function shouldGenerateImage(platform: string): boolean {
  return IMAGE_REQUIRED_PLATFORMS.has(platform);
}

function parseBrandIdentity(raw: Prisma.JsonValue): BrandIdentity | null {
  if (!raw || typeof raw !== "object") return null;
  const parsed = brandIdentitySchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/**
 * Counts the number of PostSuggestions for this user whose image was
 * generated since `weekStart`. Used to enforce the per-user weekly cap.
 */
export async function countImagesGeneratedSince(
  userId: string,
  since: Date
): Promise<number> {
  return prisma.postSuggestion.count({
    where: {
      imageGeneratedAt: { gte: since },
      socialAccount: { lateProfile: { userId } },
    },
  });
}

export type GenerateAndAttachResult =
  | { ok: true; url: string }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "already_has_image" }
  | { ok: false; reason: "platform_not_image_required" }
  | { ok: false; reason: "cap_exceeded"; cap: number; current: number }
  | { ok: false; reason: "image_too_large"; bytes: number }
  | { ok: false; reason: "generation_failed"; message: string };

/**
 * End-to-end: generate a brand-styled image via gpt-image-1, upload to
 * Cloudinary, and stamp the URL onto the PostSuggestion (also appending it
 * to `mediaItems` so the Zernio scheduler picks it up automatically).
 *
 * `capWindowStart` is the lower bound for the per-user image cap (typically
 * `now - 7 days`). Idempotent on `imageUrl` already set.
 */
export async function generateAndAttachImage(args: {
  suggestionId: string;
  capWindowStart: Date;
  weeklyCap?: number;
}): Promise<GenerateAndAttachResult> {
  const cap = args.weeklyCap ?? DEFAULT_WEEKLY_IMAGE_CAP;

  const suggestion = await prisma.postSuggestion.findUnique({
    where: { id: args.suggestionId },
    include: {
      socialAccount: {
        include: {
          lateProfile: {
            include: { user: { select: { id: true, brandIdentity: true } } },
          },
        },
      },
    },
  });
  if (!suggestion) return { ok: false, reason: "not_found" };

  if (!shouldGenerateImage(suggestion.socialAccount.platform)) {
    return { ok: false, reason: "platform_not_image_required" };
  }

  if (suggestion.imageUrl) {
    return { ok: false, reason: "already_has_image" };
  }

  const userId = suggestion.socialAccount.lateProfile.user.id;
  const current = await countImagesGeneratedSince(userId, args.capWindowStart);
  if (current >= cap) {
    console.warn(
      `[postImage] ⚠ user=${userId} hit weekly image cap (${current}/${cap}) — falling back to text-only`
    );
    return { ok: false, reason: "cap_exceeded", cap, current };
  }

  const brandIdentity = parseBrandIdentity(
    suggestion.socialAccount.lateProfile.user.brandIdentity
  );

  const strategyParse = strategySchema.safeParse(
    suggestion.socialAccount.strategy
  );
  const imageStyle = strategyParse.success
    ? strategyParse.data.imageStyle
    : "";
  if (!strategyParse.success) {
    console.warn(
      `[postImage] strategy parse failed on account=${suggestion.socialAccount.id} — generating with neutral imageStyle`
    );
  }

  let generated;
  try {
    generated = await generateImage({
      postCopy: suggestion.content,
      platform: suggestion.socialAccount.platform,
      brandIdentity,
      imageStyle,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[postImage] ✗ generation failed suggestion=${args.suggestionId}: ${message}`
    );
    return { ok: false, reason: "generation_failed", message };
  }

  if (generated.b64.length > MAX_BASE64_BYTES) {
    console.error(
      `[postImage] ✗ generated image too large (${generated.b64.length} bytes base64) for suggestion=${args.suggestionId} — refusing Cloudinary upload`
    );
    return {
      ok: false,
      reason: "image_too_large",
      bytes: generated.b64.length,
    };
  }

  let uploaded;
  try {
    uploaded = await uploadBase64Image(
      generated.b64,
      `postclaw/users/${userId}/generated`
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[postImage] ✗ cloudinary upload failed suggestion=${args.suggestionId}: ${message}`
    );
    return { ok: false, reason: "generation_failed", message };
  }

  // Merge into mediaItems — only Cloudinary URLs are allowed by the schema,
  // and uploadBase64Image returns a Cloudinary secure_url. Existing items
  // (user-attached or prior generations) are preserved.
  const existingMedia = coerceMediaItems(suggestion.mediaItems);
  const nextMedia = [
    ...existingMedia,
    { url: uploaded.url, type: "image" as const },
  ];

  await prisma.postSuggestion.update({
    where: { id: args.suggestionId },
    data: {
      imageUrl: uploaded.url,
      imagePrompt: generated.promptUsed,
      imageGeneratedAt: new Date(),
      contentType: "image",
      mediaItems: nextMedia as unknown as Prisma.InputJsonValue,
    },
  });

  console.log(
    `[postImage] ✓ suggestion=${args.suggestionId} url=${uploaded.url}`
  );

  return { ok: true, url: uploaded.url };
}
