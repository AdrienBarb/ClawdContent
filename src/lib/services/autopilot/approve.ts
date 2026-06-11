import "server-only";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { publishOrScheduleSuggestion } from "@/lib/services/publishSuggestion";
import type { BatchPostSnapshot } from "@/lib/schemas/autopilot";

export type ApproveBatchResult =
  | { ok: true; scheduled: number; failed: number }
  | { ok: false; error: "not_found" | "already_approved" | "commit_failed" };

/**
 * Review mode "Launch my week": commits every staged draft in the batch to
 * Zernio. Per-draft idempotency rides on publishOrScheduleSuggestion
 * (publishedExternalId + soft lock), so re-running after a partial failure
 * only commits what's left.
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

  // Total failure: keep the batch unapproved (the user can retry "Launch my
  // week" once the cause — e.g. a lapsed card — is fixed) but persist the
  // per-post statuses so the attention strip reflects reality.
  const totalFailure = scheduled === 0 && failed > 0;
  await prisma.weeklyBatch.update({
    where: { id: batchId },
    data: {
      ...(totalFailure ? {} : { approvedAt: new Date() }),
      posts: nextPosts as unknown as Prisma.InputJsonValue,
    },
  });

  if (totalFailure) {
    return { ok: false, error: "commit_failed" };
  }
  return { ok: true, scheduled, failed };
}
