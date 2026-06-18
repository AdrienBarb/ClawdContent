/**
 * Timezone math for the autopilot. Users store an IANA timezone
 * (User.timezone, nullable → UTC). All helpers are DST-aware via Intl —
 * worst case during a transition hour a slot lands ±1h, which is acceptable
 * for social scheduling.
 */

export const DEFAULT_TIMEZONE = "UTC";

export interface LocalParts {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  /** 0=Monday … 6=Sunday (Zernio convention used across the codebase). */
  weekday: number;
  hour: number; // 0-23
}

const WEEKDAY_TO_MONDAY0: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

export function getLocalParts(date: Date, timeZone: string): LocalParts {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    weekday: "short",
    hour12: false,
  });
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(date)) parts[p.type] = p.value;
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    weekday: WEEKDAY_TO_MONDAY0[parts.weekday] ?? 0,
    // Intl can emit "24" for midnight in some locales/options combos.
    hour: Number(parts.hour) % 24,
  };
}

/** Convert a wall-clock time in `timeZone` to the corresponding UTC instant. */
export function wallTimeToUtc(
  {
    year,
    month,
    day,
    hour,
    minute = 0,
  }: { year: number; month: number; day: number; hour: number; minute?: number },
  timeZone: string
): Date {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  // What wall time does utcGuess show in the target zone? The difference is
  // the zone offset at that instant; one correction pass is enough outside
  // the DST transition hour itself.
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(new Date(utcGuess))) parts[p.type] = p.value;
  const shownAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second)
  );
  const offset = shownAsUtc - utcGuess;
  return new Date(utcGuess - offset);
}

/**
 * Snap an instant that represents (or sits near) a local midnight to exactly
 * 00:00 local. Probes at +12h so a near-midnight instant resolves to the
 * intended local calendar day (dodging the midnight boundary), then re-resolves
 * local midnight. DST-safe — used for anchors, never for "now" (todayStart).
 */
function localMidnightOf(instant: Date, timeZone: string): Date {
  const p = getLocalParts(
    new Date(instant.getTime() + 12 * 60 * 60 * 1000),
    timeZone
  );
  return wallTimeToUtc(
    { year: p.year, month: p.month, day: p.day, hour: 0 },
    timeZone
  );
}

/**
 * The local-midnight that starts the rolling week 7 days after `anchor`.
 * Every user's week is a 7-day window anchored on their first-generation day;
 * each cycle advances the anchor by 7 calendar days. DST-safe: snaps the
 * anchor to local midnight, adds 7 days of real time, then re-resolves local
 * midnight of the resulting date.
 */
export function rollingNextAnchor(anchor: Date, timeZone: string): Date {
  const anchorMidnight = localMidnightOf(anchor, timeZone);
  return localMidnightOf(
    new Date(anchorMidnight.getTime() + 7 * 24 * 60 * 60 * 1000),
    timeZone
  );
}

/**
 * The instant of `hour:00` local on the day BEFORE `anchor`. A rolling window
 * that starts on `anchor` is generated the evening before — generalizing the
 * old "Sunday 17:00 → Monday week" to any anchor weekday, so existing
 * Monday-anchored users keep getting their week the same Sunday evening.
 */
export function generationFireAt(
  anchor: Date,
  timeZone: string,
  hour: number
): Date {
  const anchorMidnight = localMidnightOf(anchor, timeZone);
  const dayBefore = getLocalParts(
    new Date(anchorMidnight.getTime() - 12 * 60 * 60 * 1000),
    timeZone
  );
  return wallTimeToUtc(
    { year: dayBefore.year, month: dayBefore.month, day: dayBefore.day, hour },
    timeZone
  );
}

/** Local midnight of "today" in the given zone — anchor for first-week batches. */
export function todayStart(now: Date, timeZone: string): Date {
  const local = getLocalParts(now, timeZone);
  return wallTimeToUtc(
    { year: local.year, month: local.month, day: local.day, hour: 0 },
    timeZone
  );
}

/**
 * First occurrence of a weekly slot (0=Monday, local hour) on or after
 * `anchor` (a UTC instant representing a local midnight). Slots that would
 * land in the past — or within the next hour, too tight to commit — are
 * pushed one week out so Zernio never rejects the schedule.
 */
export function slotToUtc(
  anchor: Date,
  slot: { dayOfWeek: number; hour: number },
  timeZone: string,
  now: Date = new Date()
): Date {
  const anchorLocal = getLocalParts(
    new Date(anchor.getTime() + 12 * 60 * 60 * 1000),
    timeZone
  );
  const deltaDays = (slot.dayOfWeek - anchorLocal.weekday + 7) % 7;
  const approx = new Date(
    anchor.getTime() + deltaDays * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000
  );
  const local = getLocalParts(approx, timeZone);
  let at = wallTimeToUtc(
    { year: local.year, month: local.month, day: local.day, hour: slot.hour },
    timeZone
  );
  // Past/too-tight slot (first-week batches anchor on "today", so the slot's
  // weekday can be today with the hour already gone): walk forward one day at
  // a time so the post still lands in the coming days, not a week out.
  let bumps = 0;
  while (at.getTime() < now.getTime() + 60 * 60 * 1000 && bumps < 7) {
    at = new Date(at.getTime() + 24 * 60 * 60 * 1000);
    bumps += 1;
  }
  return at;
}
