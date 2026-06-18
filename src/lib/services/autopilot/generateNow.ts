import "server-only";
import { prisma } from "@/lib/db/prisma";
import { inngest } from "@/inngest";
import { todayStart, DEFAULT_TIMEZONE } from "./time";
import { getLatestBatch, listAutopilotAccounts } from "./batch";

/**
 * Manual "plan my next 7 days now" trigger. Fires the same
 * autopilot/generate-week pipeline as the cron, anchored on today so it plans a
 * fresh rolling window [today, today+7d):
 *
 *   - weekStart = todayStart → the batch idempotency key AND the planning
 *                 anchor. Changes at local midnight → at most one successful
 *                 manual fill per day. Re-anchors the user's rolling cadence to
 *                 today (the next automatic window rolls 7 days from here).
 *
 * No stable Inngest event id: per-user concurrency (1) + claimWeeklyBatch
 * idempotency + the guards below dedupe double-clicks, while leaving a *failed*
 * batch re-armable the same day (a 24h-deduped id would block in-UI retry).
 */
export type ManualWeekFillResult =
  | { ok: true; weekStart: string }
  | { ok: false; error: string };

export async function triggerManualWeekFill({
  userId,
}: {
  userId: string;
}): Promise<ManualWeekFillResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      timezone: true,
      autopilotPausedAt: true,
      subscription: { select: { status: true } },
    },
  });
  if (!user) {
    return { ok: false, error: "User not found." };
  }

  const subActive =
    user.subscription?.status === "active" ||
    user.subscription?.status === "trialing";
  if (!subActive) {
    return { ok: false, error: "An active subscription is required." };
  }
  if (user.autopilotPausedAt) {
    return {
      ok: false,
      error: "Autopilot is paused. Turn it back on to plan a week.",
    };
  }

  const accounts = await listAutopilotAccounts(userId);
  if (accounts.length === 0) {
    return { ok: false, error: "Connect a social account first." };
  }

  const tz = user.timezone ?? DEFAULT_TIMEZONE;
  const now = new Date();
  const weekStart = todayStart(now, tz);

  // Don't stack on a build already in flight (e.g. the first week still
  // generating, or a prior manual fill from moments ago).
  const latest = await getLatestBatch(userId);
  if (latest?.status === "generating") {
    return {
      ok: false,
      error: "We're already planning your week — give it a moment.",
    };
  }

  // One successful manual fill per day: a today-anchored batch that already
  // committed (ready) blocks a re-plan. A failed one is left re-armable so the
  // user can retry from the UI.
  const todayBatch = await prisma.weeklyBatch.findUnique({
    where: { userId_weekStart: { userId, weekStart } },
    select: { status: true },
  });
  if (todayBatch?.status === "ready") {
    return {
      ok: false,
      error:
        "You've already planned your next 7 days. The week after is planned for you automatically.",
    };
  }

  await inngest.send({
    name: "autopilot/generate-week",
    data: {
      userId,
      weekStart: weekStart.toISOString(),
      // "manual": a todayStart-anchored run has no hourly re-dispatch lane, so
      // onFailure alerts the user instead of waiting.
      reason: "manual",
    },
  });

  return {
    ok: true,
    weekStart: weekStart.toISOString(),
  };
}
