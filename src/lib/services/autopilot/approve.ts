import "server-only";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { publishOrScheduleSuggestion } from "@/lib/services/publishSuggestion";
import type { BatchPostSnapshot } from "@/lib/schemas/autopilot";

export type ApproveBatchResult =
  | {
      ok: true;
      /** Committed to the Zernio schedule. */
      scheduled: number;
      /** Un-publishable (failed Zernio validation) → moved to needs_media. */
      held: number;
      /** Genuine publish error (transient/infra) → left committable for retry. */
      failed: number;
      /** Whether the batch was marked approved (true unless a retryable failure remains). */
      approved: boolean;
    }
  | { ok: false; error: "not_found" | "already_approved" };

/**
 * Review mode "Launch my week": commits every staged draft in the batch to
 * Zernio. Per-draft idempotency rides on publishOrScheduleSuggestion
 * (publishedExternalId + soft lock), so re-running after a partial failure
 * only commits what's left.
 *
 * A draft that Zernio rejects as un-publishable (validation) is NOT treated as
 * a hard failure — it's moved to needs_media (held back for the user to fix)
 * and the rest of the week still commits. Only a transient publish error keeps
 * the batch unapproved so "Launch my week" can be retried.
 */
export async function approveBatch({
  userId,
  batchId,
}: {
  userId: string;
  batchId: string;
}): Promise<ApproveBatchResult> {
  const batch = await prisma.weeklyBatch.findFirst({
    where: { id: batchId, userId },
  });
  if (!batch) return { ok: false, error: "not_found" };
  if (batch.approvedAt) return { ok: false, error: "already_approved" };

  const suggestions = await prisma.postSuggestion.findMany({
    where: { batchId, status: "draft" },
    select: { id: true, scheduledAt: true },
  });
  console.log(
    `[autopilot:approve] user=${userId} batch=${batchId} committing ${suggestions.length} staged draft(s) to Zernio`
  );

  // Slots may have passed while the week waited for approval — bump stale
  // times forward so the commit isn't rejected with schedule_in_past.
  const minFuture = new Date(Date.now() + 60 * 60 * 1000);
  for (const suggestion of suggestions) {
    if (suggestion.scheduledAt && suggestion.scheduledAt < minFuture) {
      await prisma.postSuggestion.update({
        where: { id: suggestion.id },
        data: { scheduledAt: minFuture },
      });
    }
  }

  let scheduled = 0;
  let held = 0;
  let failed = 0;
  const statusBySuggestion = new Map<
    string,
    { status: string; externalPostId: string | null }
  >();

  for (const suggestion of suggestions) {
    try {
      const result = await publishOrScheduleSuggestion({
        userId,
        suggestionId: suggestion.id,
        action: "schedule",
      });
      if (result.ok) {
        scheduled += 1;
        statusBySuggestion.set(suggestion.id, {
          status: "scheduled",
          externalPostId: result.postId,
        });
        console.log(
          `[autopilot:approve] committed suggestion=${suggestion.id} → externalPostId=${result.postId}`
        );
      } else if (
        result.error === "validation_failed" ||
        result.error === "media_validation_failed"
      ) {
        // Un-publishable post — hold it back instead of blocking the whole
        // launch. Move it out of the committable-draft pool into needs_media so
        // it surfaces in "Need review" for the user to regenerate, and let the
        // rest of the week commit normally.
        held += 1;
        await prisma.postSuggestion
          .update({
            where: { id: suggestion.id },
            data: { status: "needs_media" },
          })
          .catch(() => {});
        statusBySuggestion.set(suggestion.id, {
          status: "needs_media",
          externalPostId: null,
        });
        console.warn(
          `[autopilot:approve] held suggestion=${suggestion.id} (un-publishable): ${result.error}`
        );
      } else {
        failed += 1;
        statusBySuggestion.set(suggestion.id, {
          status: "failed",
          externalPostId: null,
        });
        console.warn(
          `[autopilot:approve] commit failed suggestion=${suggestion.id}: ${result.error}`
        );
      }
    } catch (err) {
      failed += 1;
      statusBySuggestion.set(suggestion.id, {
        status: "failed",
        externalPostId: null,
      });
      console.warn(
        `[autopilot:approve] commit threw suggestion=${suggestion.id}: ${err instanceof Error ? err.message : err}`
      );
    }
  }

  console.log(
    `[autopilot:approve] user=${userId} batch=${batchId} done: scheduled=${scheduled} held=${held} failed=${failed}`
  );

  // Refresh the durable snapshot so digest links + dashboard stay accurate.
  const posts = (Array.isArray(batch.posts) ? batch.posts : []) as unknown as BatchPostSnapshot[];
  const nextPosts = posts.map((p) => {
    if (!p.suggestionId) return p;
    const outcome = statusBySuggestion.get(p.suggestionId);
    if (!outcome) return p;
    // suggestionId is kept (the row is gone, but digest action tokens minted
    // against the staged id resolve through this snapshot).
    return {
      ...p,
      status: outcome.status,
      externalPostId: outcome.externalPostId,
    };
  });

  // A retryable failure (transient publish/infra error) keeps the batch
  // unapproved so "Launch my week" can be retried once the cause is fixed.
  // Held posts (un-publishable → needs_media) do NOT block approval: they're
  // resolved out of the commit path and shown for the user to regenerate.
  const hasRetryableFailure = failed > 0;
  await prisma.weeklyBatch.update({
    where: { id: batchId },
    data: {
      ...(hasRetryableFailure ? {} : { approvedAt: new Date() }),
      posts: nextPosts as unknown as Prisma.InputJsonValue,
    },
  });

  return {
    ok: true,
    scheduled,
    held,
    failed,
    approved: !hasRetryableFailure,
  };
}
