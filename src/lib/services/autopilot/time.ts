import "server-only";

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
 * The Monday 00:00 (user-local) that starts the week FOLLOWING `now`.
 * Generation runs Sunday 17:00 local, so "the coming week" starts the next
 * day. Used as the WeeklyBatch idempotency anchor ([userId, weekStart]).
 */
export function nextWeekStart(now: Date, timeZone: string): Date {
  const local = getLocalParts(now, timeZone);
  // Days until next Monday (weekday 0). If today IS Monday, jump a full week.
  const daysUntilMonday = (7 - local.weekday) % 7 || 7;
  const base = wallTimeToUtc(
    { year: local.year, month: local.month, day: local.day, hour: 0 },
    timeZone
  );
  return new Date(base.getTime() + daysUntilMonday * 24 * 60 * 60 * 1000);
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
  if (at.getTime() < now.getTime() + 60 * 60 * 1000) {
    at = new Date(at.getTime() + 7 * 24 * 60 * 60 * 1000);
  }
  return at;
}
