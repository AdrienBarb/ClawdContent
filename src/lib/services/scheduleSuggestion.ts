import "server-only";
import { prisma } from "@/lib/db/prisma";
import { createPost, validatePost } from "@/lib/late/mutations";
import { isZernioRateLimited } from "@/lib/late/client";
import { coerceMediaItems } from "@/lib/schemas/mediaItems";
import { validateMediaItems } from "@/lib/services/mediaValidation";

const STALE_LOCK_MS = 5 * 60 * 1000;

export type ScheduleSuggestionResult =
  | { ok: true; externalId: string }
  | { ok: false; error: "not_found" }
  | { ok: false; error: "already_scheduled"; externalId: string }
  | { ok: false; error: "already_in_progress" }
  | { ok: false; error: "no_schedule_staged" }
  | { ok: false; error: "schedule_in_past" }
  | { ok: false; error: "approval_required" }
  | { ok: false; error: "media_validation_failed"; message: string }
  | {
      ok: false;
      error: "validation_failed";
      validationErrors: { platform: string; error: string }[];
    }
  | { ok: false; error: "rate_limited"; message: string }
  | { ok: false; error: "schedule_failed"; message: string };

async function releaseLock(suggestionId: string): Promise<void> {
  try {
    await prisma.postSuggestion.update({
      where: { id: suggestionId },
      data: { publishingStartedAt: null },
    });
  } catch (err) {
    console.error(
      `[scheduleSuggestion] failed to release lock for suggestion=${suggestionId}`,
      err
    );
  }
}

/**
 * Single-attempt Zernio scheduler for cron-generated drafts. Unlike
 * `publishOrScheduleSuggestion`, this does NOT delete the PostSuggestion row
 * after Zernio acknowledges — the row is retained (with `publishedExternalId`
 * stamped) so the per-platform dashboard calendar (Phase 6) can keep showing
 * upcoming posts. The user-facing chat publish flow keeps the legacy
 * delete-on-success behaviour.
 *
 * Returns a structured `rate_limited` result on Zernio 429 so the caller (the
 * weekly Inngest function) can orchestrate a durable `step.sleep` + retry.
 */
export async function scheduleSuggestionToZernio(
  suggestionId: string
): Promise<ScheduleSuggestionResult> {
  const suggestion = await prisma.postSuggestion.findUnique({
    where: { id: suggestionId },
    include: { socialAccount: { include: { lateProfile: true } } },
  });
  if (!suggestion) return { ok: false, error: "not_found" };

  // Approval mode short-circuit — the cron should already have skipped these,
  // but guard here too. Drafts in approval mode wait for the user.
  if (suggestion.approvalRequired && !suggestion.approvedAt) {
    return { ok: false, error: "approval_required" };
  }

  // Idempotency: previous attempt already created the post on Zernio.
  if (suggestion.publishedExternalId) {
    return {
      ok: false,
      error: "already_scheduled",
      externalId: suggestion.publishedExternalId,
    };
  }

  if (!suggestion.scheduledAt) {
    return { ok: false, error: "no_schedule_staged" };
  }
  if (suggestion.scheduledAt.getTime() <= Date.now()) {
    return { ok: false, error: "schedule_in_past" };
  }

  // CAS lock against double-scheduling. Stale locks (>5 min) are reclaimed.
  const claim = await prisma.postSuggestion.updateMany({
    where: {
      id: suggestionId,
      publishedExternalId: null,
      OR: [
        { publishingStartedAt: null },
        {
          publishingStartedAt: {
            lt: new Date(Date.now() - STALE_LOCK_MS),
          },
        },
      ],
    },
    data: { publishingStartedAt: new Date() },
  });
  if (claim.count === 0) return { ok: false, error: "already_in_progress" };

  const { socialAccount } = suggestion;
  const { lateProfile } = socialAccount;

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: lateProfile.userId },
    select: { timezone: true },
  });
  const userTz = user.timezone ?? "UTC";

  const mediaItems = coerceMediaItems(suggestion.mediaItems);

  const localValidation = validateMediaItems(
    mediaItems,
    socialAccount.platform
  );
  if (!localValidation.ok) {
    await releaseLock(suggestionId);
    return {
      ok: false,
      error: "media_validation_failed",
      message: localValidation.error,
    };
  }

  // Skip Zernio pre-validation for Twitter (account-context-dependent char
  // limit). Mirrors publishOrScheduleSuggestion.
  if (socialAccount.platform !== "twitter") {
    const validation = await validatePost(
      suggestion.content,
      socialAccount.platform,
      mediaItems.length > 0 ? mediaItems : undefined,
      lateProfile.lateApiKey
    );
    if (!validation.valid) {
      await releaseLock(suggestionId);
      return {
        ok: false,
        error: "validation_failed",
        validationErrors: validation.errors,
      };
    }
  }

  const mediaForCreate = mediaItems.length > 0 ? mediaItems : undefined;

  let post;
  try {
    post = await createPost(
      lateProfile.lateProfileId,
      {
        content: suggestion.content,
        platform: {
          platform: socialAccount.platform,
          accountId: socialAccount.lateAccountId,
        },
        scheduledAt: suggestion.scheduledAt.toISOString(),
        publishNow: false,
        timezone: userTz,
        ...(mediaForCreate ? { mediaItems: mediaForCreate } : {}),
      },
      lateProfile.lateApiKey
    );
  } catch (err) {
    // Zernio call failed before any post was created — safe to release the
    // lock so the next attempt (or the user) can retry.
    await releaseLock(suggestionId);
    if (isZernioRateLimited(err)) {
      return { ok: false, error: "rate_limited", message: "rate_limited" };
    }
    return { ok: false, error: "schedule_failed", message: "schedule_failed" };
  }

  // Zernio acknowledged the post — we MUST persist `publishedExternalId`
  // before this function returns, otherwise a function-level retry would
  // call Zernio again and double-post. If the DB write fails, deliberately
  // do NOT release the lock — the stale-lock window catches it on the next
  // attempt, but the externalId is logged for manual recovery.
  try {
    await prisma.postSuggestion.update({
      where: { id: suggestionId },
      data: { publishedExternalId: post.id },
    });
  } catch (dbErr) {
    console.error(
      `[scheduleSuggestion] ⚠ Zernio post created (${post.id}) for suggestion=${suggestionId} but DB stamp failed — lock left in place to prevent double-post`,
      dbErr
    );
    return {
      ok: false,
      error: "schedule_failed",
      message: "db_stamp_failed_after_zernio",
    };
  }

  return { ok: true, externalId: post.id };
}
