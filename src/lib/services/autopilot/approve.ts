import "server-only";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { publishOrScheduleSuggestion } from "@/lib/services/publishSuggestion";
import type { BatchPostSnapshot } from "@/lib/schemas/autopilot";

export type ApproveBatchResult =
  | { ok: true; scheduled: number; failed: number }
  | { ok: false; error: "not_found" | "already_approved" };

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
    select: { id: true },
  });

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
    return {
      ...p,
      status: outcome.status,
      externalPostId: outcome.externalPostId,
      suggestionId: outcome.status === "scheduled" ? null : p.suggestionId,
    };
  });

  await prisma.weeklyBatch.update({
    where: { id: batchId },
    data: {
      approvedAt: new Date(),
      posts: nextPosts as unknown as Prisma.InputJsonValue,
    },
  });

  return { ok: true, scheduled, failed };
}
