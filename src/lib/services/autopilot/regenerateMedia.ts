import "server-only";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { getOrBuildStyleKit } from "@/lib/media/styleKit";
import { renderStaticMedia, type PostMediaPlan } from "@/lib/media/mediaPlan";
import type { MediaItem } from "@/lib/schemas/mediaItems";

export type RegenerateMediaResult =
  | { ok: true; mediaItems: MediaItem[] }
  | { ok: false; error: "not_found" | "generation_failed" };

function isMediaPlan(value: unknown): value is PostMediaPlan {
  return (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    typeof (value as { kind: unknown }).kind === "string"
  );
}

/**
 * Re-render a draft's media on demand (edit sheet / digest attention flow).
 * Uses the stored mediaPlan when present; otherwise derives a photo plan from
 * the caption. Reels regenerate as a fresh hero still — full video re-renders
 * only happen inside the weekly Inngest run (Veo can take ~6 minutes).
 */
export async function regenerateSuggestionMedia({
  userId,
  suggestionId,
}: {
  userId: string;
  suggestionId: string;
}): Promise<RegenerateMediaResult> {
  const suggestion = await prisma.postSuggestion.findFirst({
    where: { id: suggestionId, socialAccount: { lateProfile: { userId } } },
    select: {
      id: true,
      content: true,
      contentType: true,
      mediaPlan: true,
      batchId: true,
      status: true,
    },
  });
  if (!suggestion) return { ok: false, error: "not_found" };

  let plan: PostMediaPlan;
  if (isMediaPlan(suggestion.mediaPlan) && suggestion.mediaPlan.kind !== "none") {
    plan = suggestion.mediaPlan;
    if (plan.kind === "reel") {
      // Synchronous regen renders the hero scene as a static image.
      plan = { kind: "photo", imagePrompt: plan.imagePrompt ?? suggestion.content.slice(0, 200) };
    }
  } else {
    plan = { kind: "photo", imagePrompt: suggestion.content.slice(0, 200) };
  }

  const kit = await getOrBuildStyleKit(userId);
  const result = await renderStaticMedia({
    userId,
    batchId: suggestion.batchId ?? "manual",
    plan,
    kit,
    aspectRatio: "4:5",
  });

  if (!result.ok || result.mediaItems.length === 0) {
    return { ok: false, error: "generation_failed" };
  }

  await prisma.postSuggestion.update({
    where: { id: suggestionId },
    data: {
      mediaItems: result.mediaItems as unknown as Prisma.InputJsonValue,
      contentType: plan.kind === "carousel" ? "carousel" : "image",
      // Only a render that passed the OCR guard clears the needs_media hold.
      ...(suggestion.status === "needs_media" && result.textVerified
        ? { status: "draft" }
        : {}),
    },
  });

  return { ok: true, mediaItems: result.mediaItems };
}
