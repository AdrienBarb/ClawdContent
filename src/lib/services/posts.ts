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
  | { ok: false; error: "media_validation_failed"; message: string }
  | { ok: false; error: "already_published"; message: string };

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

  // Once Zernio has the post, our DB no longer owns its scheduled time —
  // letting the user edit the row here would silently drift the calendar
  // away from what actually publishes. Zernio has no edit endpoint for
  // scheduled posts (only delete + retry), so refuse the edit.
  if (existing.publishedExternalId) {
    return {
      ok: false,
      error: "already_published",
      message:
        "This post is already scheduled with the platform — edits are locked.",
    };
  }

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

export type RegenerateImageResult =
  | GenerateAndAttachResult
  | { ok: false; reason: "already_regenerating" };

const REGEN_LOCK_MS = 5 * 60 * 1000;

/**
 * Regenerates the AI image attached to a draft. Atomic CAS claim on
 * `publishingStartedAt` (reusing the publish soft-lock since regen runs
 * are mutually exclusive with publishing). Two concurrent clicks: only
 * the first claim wins; the second returns `already_regenerating` and
 * burns no OpenAI credit. Lock is released in finally — stale locks
 * (>5 min) are auto-reclaimed by the next attempt.
 */
export async function regeneratePostSuggestionImage(
  userId: string,
  suggestionId: string
): Promise<RegenerateImageResult> {
  // 1. Ownership + existence check.
  const existing = await prisma.postSuggestion.findFirst({
    where: {
      id: suggestionId,
      socialAccount: { lateProfile: { userId } },
    },
    select: {
      id: true,
      imageUrl: true,
      mediaItems: true,
      publishedExternalId: true,
    },
  });
  if (!existing) return { ok: false, reason: "not_found" };

  // 2. CAS claim: only proceed if no active regen / publish in-flight.
  //    Stale locks (>5 min) are reclaimed.
  const claim = await prisma.postSuggestion.updateMany({
    where: {
      id: suggestionId,
      publishedExternalId: null,
      OR: [
        { publishingStartedAt: null },
        { publishingStartedAt: { lt: new Date(Date.now() - REGEN_LOCK_MS) } },
      ],
    },
    data: { publishingStartedAt: new Date() },
  });
  if (claim.count === 0) {
    return { ok: false, reason: "already_regenerating" };
  }

  try {
    // 3. Now safe to clear the old image — we hold the lock.
    if (existing.imageUrl) {
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

    return await generateAndAttachImage({
      suggestionId,
      capWindowStart: new Date(Date.now() - SEVEN_DAYS_MS),
    });
  } finally {
    // Release the lock so the user can retry. If a row is gone the update
    // silently no-ops.
    await prisma.postSuggestion
      .updateMany({
        where: { id: suggestionId, publishedExternalId: null },
        data: { publishingStartedAt: null },
      })
      .catch((err) =>
        console.error(
          `[regenerate] failed to release lock suggestion=${suggestionId}`,
          err
        )
      );
  }
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
 * Approval-mode commit. The atomic CAS on `approvedAt` is what protects
 * against the classic double-publish race: two concurrent approve clicks
 * would otherwise both see `approvedAt === null`, both stamp it, and both
 * call Zernio. `updateMany` returns count=1 for exactly one racer; the
 * other gets `already_approved`. After Zernio acknowledges, the row is
 * left in place (we want it on the calendar with its externalId).
 *
 * `already_scheduled` from Zernio is *not* a failure — it means a prior
 * partial run pushed the post but our DB stamp was lost. Roll the
 * externalId back into our row and treat as success.
 */
export async function approvePostSuggestion(
  userId: string,
  suggestionId: string
): Promise<ApproveSuggestionResult> {
  // Initial peek for early-return error variants (no row mutation yet).
  const peek = await prisma.postSuggestion.findFirst({
    where: {
      id: suggestionId,
      socialAccount: { lateProfile: { userId } },
    },
    select: {
      approvalRequired: true,
      approvedAt: true,
      scheduledAt: true,
      publishedExternalId: true,
    },
  });
  if (!peek) return { ok: false, error: "not_found" };
  if (!peek.approvalRequired) return { ok: false, error: "not_in_approval_mode" };
  if (peek.approvedAt) return { ok: false, error: "already_approved" };
  if (!peek.scheduledAt) return { ok: false, error: "no_schedule_staged" };
  if (peek.scheduledAt.getTime() <= Date.now()) {
    return { ok: false, error: "schedule_in_past" };
  }

  // Atomic claim. The same WHERE clause as the peek means this is a CAS:
  // only the racer who finds `approvedAt: null` wins. We record the
  // timestamp we wrote so a later rollback can guard against clobbering
  // a concurrent approval.
  const approvedAtClaim = new Date();
  const claim = await prisma.postSuggestion.updateMany({
    where: {
      id: suggestionId,
      approvalRequired: true,
      approvedAt: null,
      socialAccount: { lateProfile: { userId } },
    },
    data: { approvedAt: approvedAtClaim },
  });
  if (claim.count === 0) return { ok: false, error: "already_approved" };

  const result: ScheduleSuggestionResult = await scheduleSuggestionToZernio(suggestionId);

  if (result.ok) return { ok: true, externalId: result.externalId };

  // Zernio said it already has this post — stamp the externalId and call
  // it a success rather than retrying or rolling back. This handles a
  // partial prior run where Zernio ack'd but our DB stamp was lost.
  if (result.error === "already_scheduled") {
    await prisma.postSuggestion
      .updateMany({
        where: {
          id: suggestionId,
          publishedExternalId: null,
        },
        data: { publishedExternalId: result.externalId },
      })
      .catch((err) =>
        console.error(
          `[approve] couldn't backfill externalId for suggestion=${suggestionId}`,
          err
        )
      );
    return { ok: true, externalId: result.externalId };
  }

  // Rollback only if our timestamp is still the winner. Guards against a
  // concurrent successful approval (which can happen if the scheduler
  // released its CAS lock before our function returned).
  await prisma.postSuggestion.updateMany({
    where: {
      id: suggestionId,
      approvedAt: approvedAtClaim,
      publishedExternalId: null,
    },
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
