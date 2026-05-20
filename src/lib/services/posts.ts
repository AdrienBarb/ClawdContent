import "server-only";
import { prisma } from "@/lib/db/prisma";
import {
  listPosts as lateListPosts,
  getPost as lateGetPost,
  deletePost as lateDeletePost,
  retryPost as lateRetryPost,
  unpublishPost as lateUnpublishPost,
  updatePost as lateUpdatePost,
  LatePostDetail,
  PaginatedPosts,
} from "@/lib/late/mutations";
import {
  generateAndAttachImage,
  type GenerateAndAttachResult,
} from "@/lib/services/postImage";
import {
  scheduleSuggestionToZernio,
  type ScheduleSuggestionResult,
} from "@/lib/services/scheduleSuggestion";
import { validateMediaItems } from "@/lib/services/mediaValidation";
import { coerceMediaItems } from "@/lib/schemas/mediaItems";
import type { UpdatePostSuggestionInput } from "@/lib/schemas/posts";
import type { Prisma } from "@prisma/client";

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function getUserPosts(
  userId: string,
  options?: { status?: string; limit?: number; page?: number; sortBy?: string; platform?: string }
): Promise<PaginatedPosts> {
  const lateProfile = await prisma.lateProfile.findUnique({
    where: { userId },
  });

  if (!lateProfile) {
    return { posts: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } };
  }

  return lateListPosts(
    lateProfile.lateProfileId,
    lateProfile.lateApiKey,
    options
  );
}

export async function getUserPost(
  userId: string,
  postId: string
): Promise<LatePostDetail> {
  const lateProfile = await prisma.lateProfile.findUnique({
    where: { userId },
  });

  if (!lateProfile) {
    throw new Error("Late profile not found. Please wait for provisioning to complete.");
  }

  return lateGetPost(postId, lateProfile.lateApiKey);
}

export async function deleteUserPost(
  userId: string,
  postId: string
): Promise<void> {
  const lateProfile = await prisma.lateProfile.findUnique({
    where: { userId },
  });

  if (!lateProfile) {
    throw new Error("Late profile not found. Please wait for provisioning to complete.");
  }

  await lateDeletePost(postId, lateProfile.lateApiKey);
}

export async function retryUserPost(
  userId: string,
  postId: string
): Promise<void> {
  const lateProfile = await prisma.lateProfile.findUnique({
    where: { userId },
  });

  if (!lateProfile) {
    throw new Error("Late profile not found. Please wait for provisioning to complete.");
  }

  await lateRetryPost(postId, lateProfile.lateApiKey);
}

export async function unpublishUserPost(
  userId: string,
  postId: string,
  platform: string
): Promise<void> {
  const lateProfile = await prisma.lateProfile.findUnique({
    where: { userId },
  });

  if (!lateProfile) {
    throw new Error("Late profile not found. Please wait for provisioning to complete.");
  }

  await lateUnpublishPost(postId, platform, lateProfile.lateApiKey);
}

export async function updateUserPost(
  userId: string,
  postId: string,
  data: { content?: string; scheduledAt?: string | null; mediaItems?: { url: string; type: string }[] }
): Promise<void> {
  const lateProfile = await prisma.lateProfile.findUnique({
    where: { userId },
  });

  if (!lateProfile) {
    throw new Error("Late profile not found. Please wait for provisioning to complete.");
  }

  await lateUpdatePost(postId, data, lateProfile.lateApiKey);
}

/* ─────────────────────────────────────────────────────────────────────────
 *  PostSuggestion service — draft CRUD owned by the per-platform dashboard.
 *  Operations on the rows in our DB. Distinct from the Late/Zernio wrappers
 *  above (which manage already-published posts).
 * ───────────────────────────────────────────────────────────────────────── */

export type UpdateSuggestionResult =
  | { ok: true }
  | { ok: false; error: "not_found" }
  | { ok: false; error: "invalid_schedule"; message: string }
  | { ok: false; error: "media_validation_failed"; message: string };

/**
 * Validates ownership via lateProfile.userId, validates schedule bounds and
 * platform-specific media rules, then patches the row. Caller may pass any
 * subset of fields; ungiven keys are untouched.
 */
export async function updatePostSuggestion(
  userId: string,
  suggestionId: string,
  input: UpdatePostSuggestionInput
): Promise<UpdateSuggestionResult> {
  const existing = await prisma.postSuggestion.findFirst({
    where: {
      id: suggestionId,
      socialAccount: { lateProfile: { userId } },
    },
    include: { socialAccount: { select: { platform: true } } },
  });
  if (!existing) return { ok: false, error: "not_found" };

  if (typeof input.scheduledAt === "string") {
    const parsed = new Date(input.scheduledAt);
    if (Number.isNaN(parsed.getTime())) {
      return { ok: false, error: "invalid_schedule", message: "Invalid date." };
    }
    if (parsed.getTime() <= Date.now()) {
      return {
        ok: false,
        error: "invalid_schedule",
        message: "Schedule time must be in the future.",
      };
    }
    if (parsed.getTime() > Date.now() + ONE_YEAR_MS) {
      return {
        ok: false,
        error: "invalid_schedule",
        message: "Schedule time can't be more than a year out.",
      };
    }
  }

  if (input.mediaItems !== undefined) {
    const result = validateMediaItems(input.mediaItems, existing.socialAccount.platform);
    if (!result.ok) {
      return { ok: false, error: "media_validation_failed", message: result.error };
    }
  }

  const data: Record<string, unknown> = {};
  if (input.content !== undefined) data.content = input.content;
  if (input.mediaItems !== undefined) data.mediaItems = input.mediaItems;
  if (input.suggestedDay !== undefined) data.suggestedDay = input.suggestedDay;
  if (input.suggestedHour !== undefined) data.suggestedHour = input.suggestedHour;
  if (input.scheduledAt !== undefined) {
    data.scheduledAt =
      input.scheduledAt === null ? null : new Date(input.scheduledAt);
  }

  await prisma.postSuggestion.update({ where: { id: suggestionId }, data });
  return { ok: true };
}

export type DeleteSuggestionResult =
  | { ok: true }
  | { ok: false; error: "not_found" };

/** Deletes a draft. Idempotent: a row already gone returns `not_found`. */
export async function deletePostSuggestion(
  userId: string,
  suggestionId: string
): Promise<DeleteSuggestionResult> {
  const existing = await prisma.postSuggestion.findFirst({
    where: {
      id: suggestionId,
      socialAccount: { lateProfile: { userId } },
    },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "not_found" };

  await prisma.postSuggestion.delete({ where: { id: suggestionId } });
  return { ok: true };
}

/**
 * Regenerates the AI image attached to a draft. Force-clears any existing
 * `imageUrl`/`imagePrompt`/`imageGeneratedAt` so the underlying generator
 * (which is idempotent on `imageUrl`) re-runs. Honors the per-user weekly
 * image cap (50 by default).
 */
export async function regeneratePostSuggestionImage(
  userId: string,
  suggestionId: string
): Promise<GenerateAndAttachResult> {
  const existing = await prisma.postSuggestion.findFirst({
    where: {
      id: suggestionId,
      socialAccount: { lateProfile: { userId } },
    },
    select: { id: true, imageUrl: true, mediaItems: true },
  });
  if (!existing) return { ok: false, reason: "not_found" };

  if (existing.imageUrl) {
    // Strip the prior generated image from mediaItems so the new one doesn't
    // pile on as a second attachment. Preserves anything the user added
    // manually.
    const filtered = coerceMediaItems(existing.mediaItems).filter(
      (m) => m.url !== existing.imageUrl
    );
    await prisma.postSuggestion.update({
      where: { id: suggestionId },
      data: {
        imageUrl: null,
        imagePrompt: null,
        imageGeneratedAt: null,
        mediaItems: filtered as unknown as Prisma.InputJsonValue,
      },
    });
  }

  return generateAndAttachImage({
    suggestionId,
    capWindowStart: new Date(Date.now() - SEVEN_DAYS_MS),
  });
}

export type ApproveSuggestionResult =
  | { ok: true; externalId: string }
  | { ok: false; error: "not_found" }
  | { ok: false; error: "not_in_approval_mode" }
  | { ok: false; error: "no_schedule_staged" }
  | { ok: false; error: "schedule_in_past" }
  | { ok: false; error: "already_approved" }
  | { ok: false; error: "schedule_failed"; message: string };

/**
 * Approval-mode commit: stamps `approvedAt` and pushes the draft to Zernio
 * via `scheduleSuggestionToZernio` (which retains the row so the calendar
 * keeps showing it post-schedule). Approve is a no-op unless the draft was
 * created under `approvalRequired = true`.
 */
export async function approvePostSuggestion(
  userId: string,
  suggestionId: string
): Promise<ApproveSuggestionResult> {
  const existing = await prisma.postSuggestion.findFirst({
    where: {
      id: suggestionId,
      socialAccount: { lateProfile: { userId } },
    },
    select: {
      id: true,
      approvalRequired: true,
      approvedAt: true,
      scheduledAt: true,
      publishedExternalId: true,
    },
  });
  if (!existing) return { ok: false, error: "not_found" };
  if (!existing.approvalRequired) return { ok: false, error: "not_in_approval_mode" };
  if (existing.approvedAt) return { ok: false, error: "already_approved" };
  if (!existing.scheduledAt) return { ok: false, error: "no_schedule_staged" };
  if (existing.scheduledAt.getTime() <= Date.now()) {
    return { ok: false, error: "schedule_in_past" };
  }

  await prisma.postSuggestion.update({
    where: { id: suggestionId },
    data: { approvedAt: new Date() },
  });

  const result: ScheduleSuggestionResult = await scheduleSuggestionToZernio(suggestionId);
  if (result.ok) return { ok: true, externalId: result.externalId };

  // Roll back the approvedAt stamp so the user can fix the issue (e.g.,
  // pick a new schedule time after their first one went stale) and retry.
  await prisma.postSuggestion.update({
    where: { id: suggestionId },
    data: { approvedAt: null },
  });

  if (result.error === "schedule_in_past") {
    return { ok: false, error: "schedule_in_past" };
  }
  if (result.error === "no_schedule_staged") {
    return { ok: false, error: "no_schedule_staged" };
  }
  const message =
    "message" in result && typeof result.message === "string"
      ? result.message
      : result.error;
  return { ok: false, error: "schedule_failed", message };
}
