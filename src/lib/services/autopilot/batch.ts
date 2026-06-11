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
    // `posts` is set the moment the commit phase starts (and at finalize).
    // A failed run that already reached commit may have live Zernio posts
    // with their local rows deleted — re-planning would double-post the
    // week. Those batches never auto-retry; the user gets the alert instead.
    if (existing.posts !== null) return null;
    // Purge the prior attempt's uncommitted drafts so a re-plan can't leave
    // two sets of rows under one batchId (review mode would commit both).
    const [, updated] = await prisma.$transaction([
      prisma.postSuggestion.deleteMany({
        where: { batchId: existing.id, status: { in: ["draft", "needs_media"] } },
      }),
      prisma.weeklyBatch.update({
        where: { id: existing.id },
        data: { status: "generating", attempts: { increment: 1 }, error: null },
      }),
    ]);
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

/**
 * Guarded transition: only a batch still "generating" can fail. Without the
 * guard, a late error (e.g. the digest send after finalize) would demote a
 * fully-committed "ready" batch and the hourly re-dispatch would re-plan and
 * double-post the whole week. Returns whether the transition happened.
 */
export async function failBatch({
  batchId,
  error,
}: {
  batchId: string;
  error: string;
}): Promise<boolean> {
  const res = await prisma.weeklyBatch.updateMany({
    where: { id: batchId, status: "generating" },
    data: { status: "failed", error: error.slice(0, 1000) },
  });
  return res.count > 0;
}

/**
 * Stamp the commit-phase marker (empty posts array ≠ null). claimWeeklyBatch
 * refuses to re-arm any batch whose `posts` is non-null — the duplicate-commit
 * firewall for runs that crash mid-commit.
 */
export async function markCommitPhase(batchId: string): Promise<void> {
  await prisma.weeklyBatch.update({
    where: { id: batchId },
    data: { posts: [] as unknown as Prisma.InputJsonValue },
  });
}

export async function markDigestSent(batchId: string): Promise<void> {
  await prisma.weeklyBatch.update({
    where: { id: batchId },
    data: { digestSentAt: new Date() },
  });
}

/**
 * Update one post's snapshot entry inside WeeklyBatch.posts. Serialized with
 * a row lock — the webhook retry handler, digest actions and approve flow can
 * all write concurrently, and an unguarded read-modify-write loses updates.
 */
export async function updateBatchPostSnapshot(
  batchId: string,
  match: { externalPostId?: string; suggestionId?: string },
  patch: Partial<BatchPostSnapshot>
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ posts: unknown }[]>`
      SELECT "posts" FROM "weekly_batch" WHERE "id" = ${batchId} FOR UPDATE`;
    const posts = rows[0]?.posts;
    if (!Array.isArray(posts)) return;
    const next = (posts as unknown as BatchPostSnapshot[]).map((p) => {
      const hit =
        (match.externalPostId && p.externalPostId === match.externalPostId) ||
        (match.suggestionId && p.suggestionId === match.suggestionId);
      return hit ? { ...p, ...patch } : p;
    });
    await tx.weeklyBatch.update({
      where: { id: batchId },
      data: { posts: next as unknown as Prisma.InputJsonValue },
    });
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
