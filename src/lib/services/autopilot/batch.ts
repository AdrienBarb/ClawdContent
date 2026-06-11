import "server-only";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { SUPPORTED_PLATFORMS } from "@/lib/insights/platformConfig";
import type { BatchPostSnapshot } from "@/lib/schemas/autopilot";

/**
 * WeeklyBatch lifecycle helpers. One row per user per week
 * (unique [userId, weekStart]); `posts` holds the compact snapshot the digest
 * email, dashboard banner and attention strip render from — local
 * PostSuggestion rows are deleted on commit (existing publish pattern), so
 * this snapshot is the only durable record of what the week contained.
 */

export const MAX_BATCH_ATTEMPTS = 3;

export interface BatchHandle {
  id: string;
  status: string;
  mode: string;
  brief: string | null;
  weekStart: string; // ISO
  attempts: number;
}

/**
 * Create (or re-arm) the batch for a week. Consumes User.pendingBrief and
 * snapshots User.autopilotMode at generation time. Returns `null` when the
 * batch is already ready/generating past the attempt budget — the caller
 * skips quietly (idempotency across event redelivery + hourly re-dispatch).
 */
export async function claimWeeklyBatch({
  userId,
  weekStart,
}: {
  userId: string;
  weekStart: Date;
}): Promise<BatchHandle | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { autopilotMode: true, pendingBrief: true },
  });
  if (!user) return null;

  const existing = await prisma.weeklyBatch.findUnique({
    where: { userId_weekStart: { userId, weekStart } },
  });

  if (existing) {
    if (existing.status === "ready") return null;
    if (existing.attempts >= MAX_BATCH_ATTEMPTS) return null;
    const updated = await prisma.weeklyBatch.update({
      where: { id: existing.id },
      data: { status: "generating", attempts: { increment: 1 }, error: null },
    });
    return toHandle(updated);
  }

  const brief = user.pendingBrief;
  const [batch] = await prisma.$transaction([
    prisma.weeklyBatch.create({
      data: {
        userId,
        weekStart,
        status: "generating",
        mode: user.autopilotMode,
        brief,
        attempts: 1,
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { pendingBrief: null },
    }),
  ]);
  return toHandle(batch);
}

function toHandle(batch: {
  id: string;
  status: string;
  mode: string;
  brief: string | null;
  weekStart: Date;
  attempts: number;
}): BatchHandle {
  return {
    id: batch.id,
    status: batch.status,
    mode: batch.mode,
    brief: batch.brief,
    weekStart: batch.weekStart.toISOString(),
    attempts: batch.attempts,
  };
}

export async function finalizeBatch({
  batchId,
  posts,
}: {
  batchId: string;
  posts: BatchPostSnapshot[];
}): Promise<void> {
  await prisma.weeklyBatch.update({
    where: { id: batchId },
    data: {
      status: "ready",
      posts: posts as unknown as Prisma.InputJsonValue,
    },
  });
}

export async function failBatch({
  batchId,
  error,
}: {
  batchId: string;
  error: string;
}): Promise<void> {
  await prisma.weeklyBatch.update({
    where: { id: batchId },
    data: { status: "failed", error: error.slice(0, 1000) },
  });
}

export async function markDigestSent(batchId: string): Promise<void> {
  await prisma.weeklyBatch.update({
    where: { id: batchId },
    data: { digestSentAt: new Date() },
  });
}

/** Update one post's snapshot entry inside WeeklyBatch.posts (best-effort). */
export async function updateBatchPostSnapshot(
  batchId: string,
  match: { externalPostId?: string; suggestionId?: string },
  patch: Partial<BatchPostSnapshot>
): Promise<void> {
  const batch = await prisma.weeklyBatch.findUnique({
    where: { id: batchId },
    select: { posts: true },
  });
  if (!batch || !Array.isArray(batch.posts)) return;
  const posts = batch.posts as unknown as BatchPostSnapshot[];
  const next = posts.map((p) => {
    const hit =
      (match.externalPostId && p.externalPostId === match.externalPostId) ||
      (match.suggestionId && p.suggestionId === match.suggestionId);
    return hit ? { ...p, ...patch } : p;
  });
  await prisma.weeklyBatch.update({
    where: { id: batchId },
    data: { posts: next as unknown as Prisma.InputJsonValue },
  });
}

/** Active, supported, connected accounts eligible for autopilot planning. */
export async function listAutopilotAccounts(
  userId: string
): Promise<{ id: string; platform: string; username: string }[]> {
  const profile = await prisma.lateProfile.findUnique({
    where: { userId },
    include: {
      socialAccounts: {
        where: {
          status: "active",
          platform: { in: [...SUPPORTED_PLATFORMS] },
        },
        select: { id: true, platform: true, username: true },
      },
    },
  });
  return profile?.socialAccounts ?? [];
}

/** The most recent batch for a user (for /api/dashboard/status + UI). */
export async function getLatestBatch(userId: string) {
  return prisma.weeklyBatch.findFirst({
    where: { userId },
    orderBy: { weekStart: "desc" },
  });
}
