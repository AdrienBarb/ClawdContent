import {
  todayStart,
  rollingNextAnchor,
  generationFireAt,
  slotToUtc,
} from "./time";

/**
 * Pure scheduling logic for the rolling autopilot week — no Prisma, no AI, no
 * secrets, so it is directly unit-testable (see schedule.test.ts). Each user's
 * "week" is a 7-day window anchored on their first-generation day; the anchor
 * advances 7 calendar days each cycle. The hourly dispatch decides WHEN a user
 * is due (`computeDueAnchor`); the planner decides WHERE each post lands inside
 * the window (`planSlotDates`).
 */

export type DueKind = "bootstrap" | "advance" | "retry" | "wait";

/**
 * A batch stuck "generating" past this (e.g. the run was hard-killed before its
 * onFailure handler could mark it failed) must not wedge the user forever — the
 * dispatch advances past it to the next window. Generous vs. any real run
 * (reel polling caps ~8 min; Inngest retries add minutes), so a legitimately
 * in-flight build is never treated as stale.
 */
const STALE_GENERATING_MS = 2 * 60 * 60 * 1000;

/** Minimal batch shape the dispatch needs to decide the next window. */
export interface LatestBatchInfo {
  weekStart: Date;
  status: string; // "generating" | "ready" | "failed"
  attempts: number;
  posts: unknown; // null = never committed · [] = commit-phase marker · array = ready
  updatedAt: Date; // last write — used to detect a wedged "generating" batch
}

export interface DueAnchor {
  due: boolean;
  kind: DueKind;
  anchor: Date;
  fireAt: Date;
}

/**
 * Decide the user's next rolling window and whether it's time to generate it.
 *
 * - No batch yet (first window never landed, or a pre-rolling account with no
 *   history): bootstrap a window starting today, fire immediately.
 * - A build in flight (and not stale): never stack a second window.
 * - A failed window with retry budget and no commit-phase marker: retry the
 *   SAME window so the user doesn't lose that week.
 * - Otherwise (ready, failed-and-exhausted, or a wedged "generating" past
 *   STALE_GENERATING_MS): advance to anchor + 7 days.
 *
 * A window is generated the evening BEFORE it starts (`generationFireAt`), so
 * `due` is true once `now` reaches that instant.
 */
export function computeDueAnchor({
  latest,
  now,
  timeZone,
  dispatchHour,
  maxAttempts,
}: {
  latest: LatestBatchInfo | null;
  now: Date;
  timeZone: string;
  dispatchHour: number;
  maxAttempts: number;
}): DueAnchor {
  if (!latest) {
    const anchor = todayStart(now, timeZone);
    return { due: true, kind: "bootstrap", anchor, fireAt: now };
  }

  // A build still in flight blocks a second window — unless it's wedged (stuck
  // "generating" long past any real run), in which case we advance past it so
  // the user isn't stranded with no content forever.
  const wedged =
    now.getTime() - latest.updatedAt.getTime() > STALE_GENERATING_MS;
  if (latest.status === "generating" && !wedged) {
    const anchor = latest.weekStart;
    return {
      due: false,
      kind: "wait",
      anchor,
      fireAt: generationFireAt(anchor, timeZone, dispatchHour),
    };
  }

  const retryable =
    latest.status === "failed" &&
    latest.attempts < maxAttempts &&
    latest.posts === null;
  const anchor = retryable
    ? latest.weekStart
    : rollingNextAnchor(latest.weekStart, timeZone);
  const fireAt = generationFireAt(anchor, timeZone, dispatchHour);
  return {
    due: now.getTime() >= fireAt.getTime(),
    kind: retryable ? "retry" : "advance",
    anchor,
    fireAt,
  };
}

export interface PlannedSlot {
  /** Index of the source slot (= the post index) — pairing is explicit, not
   *  positional, so a clamped-out slot can't misalign the survivors. */
  index: number;
  dayOfWeek: number;
  hour: number;
  scheduledAt: Date;
}

/**
 * Spread raw best-time slots across distinct days, resolve each to a UTC
 * instant inside the rolling window [anchor, anchor+7d), and drop any that
 * fall outside it. The clamp is an unconditional invariant: a post can never
 * bleed past the 7th day, regardless of how late in the window we generate.
 *
 * Each survivor carries its source `index`, so the caller pairs by
 * `posts[slot.index]` — a dropped slot (anywhere in the list) never shifts the
 * pairing of the others.
 */
export function planSlotDates({
  anchor,
  slots,
  timeZone,
  now,
}: {
  anchor: Date;
  slots: { dayOfWeek: number; hour: number }[];
  timeZone: string;
  now?: Date;
}): PlannedSlot[] {
  const windowEnd = anchor.getTime() + 7 * 24 * 60 * 60 * 1000;
  const usedDays = new Set<number>();
  const result: PlannedSlot[] = [];
  slots.forEach((slot, index) => {
    // Spread across distinct days when the best-times list is short — never
    // stack a whole week of posts on the same weekday.
    let day = slot.dayOfWeek;
    let guard = 0;
    while (usedDays.has(day) && guard < 7) {
      day = (day + 1) % 7;
      guard += 1;
    }
    usedDays.add(day);
    const scheduledAt = slotToUtc(
      anchor,
      { dayOfWeek: day, hour: slot.hour },
      timeZone,
      now
    );
    const t = scheduledAt.getTime();
    if (t >= anchor.getTime() && t < windowEnd) {
      result.push({ index, dayOfWeek: day, hour: slot.hour, scheduledAt });
    }
  });
  return result;
}
