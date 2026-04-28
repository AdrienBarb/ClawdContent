import { PLATFORM_CONFIG } from "@/lib/insights/platformConfig";

export interface NormalizedSlot {
  day: number; // 0=Monday..6=Sunday
  hour: number; // 0-23
  engagement: number; // higher = better
}

export const GENERIC_DEFAULT_SLOTS: NormalizedSlot[] = [
  { day: 1, hour: 10, engagement: 3 },
  { day: 3, hour: 13, engagement: 2 },
  { day: 5, hour: 17, engagement: 1 },
];

export function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

// JS getDay() is Sun=0..Sat=6; project data is Mon=0..Sun=6.
export function dayOfWeekZernio(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export function atTime(base: Date, hour: number, minute = 0): Date {
  const d = new Date(base);
  d.setHours(hour, minute, 0, 0);
  return d;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

interface ApiSlotShape {
  day_of_week: number;
  hour: number;
  avg_engagement?: number;
  post_count?: number;
}

interface InsightsSlotShape {
  dayOfWeek: number;
  hour: number;
  avgEngagement?: number;
  postCount?: number;
}

type AnySlotShape = ApiSlotShape | InsightsSlotShape;

function isInsightsShape(s: AnySlotShape): s is InsightsSlotShape {
  return "dayOfWeek" in s;
}

export interface GetBestSlotsArgs {
  insightsBestTimes?: AnySlotShape[] | null;
  platform?: string;
}

export function getBestSlots({
  insightsBestTimes,
  platform,
}: GetBestSlotsArgs): NormalizedSlot[] {
  if (insightsBestTimes && insightsBestTimes.length > 0) {
    return insightsBestTimes
      .map((s) => ({
        day: isInsightsShape(s) ? s.dayOfWeek : s.day_of_week,
        hour: s.hour,
        engagement: isInsightsShape(s)
          ? (s.avgEngagement ?? 0)
          : (s.avg_engagement ?? 0),
      }))
      .sort((a, b) => b.engagement - a.engagement);
  }
  if (platform && PLATFORM_CONFIG[platform]) {
    const defaults = PLATFORM_CONFIG[platform].defaultBestTimes;
    return defaults.map((s, i) => ({
      day: s.dayOfWeek,
      hour: s.hour,
      engagement: defaults.length - i,
    }));
  }
  return GENERIC_DEFAULT_SLOTS;
}

export interface PickResult {
  date: Date;
  time: string; // "HH:00"
}

// Highest-engagement slot whose hour hasn't passed today; otherwise the next
// day with a slot. Slots must already be sorted by engagement DESC.
export function pickNextSlot(
  slots: NormalizedSlot[],
  now: Date,
  today: Date
): PickResult {
  const todayDow = dayOfWeekZernio(today);
  for (const slot of slots) {
    if (slot.day !== todayDow) continue;
    const candidate = atTime(today, slot.hour);
    if (candidate.getTime() > now.getTime()) {
      return { date: candidate, time: `${pad2(slot.hour)}:00` };
    }
  }
  for (let offset = 1; offset <= 7; offset++) {
    const day = new Date(today);
    day.setDate(day.getDate() + offset);
    const dow = dayOfWeekZernio(day);
    const best = slots.find((s) => s.day === dow);
    if (best) {
      return { date: atTime(day, best.hour), time: `${pad2(best.hour)}:00` };
    }
  }
  const fallback = atTime(today, 10);
  if (fallback.getTime() <= now.getTime()) {
    fallback.setDate(fallback.getDate() + 1);
  }
  return { date: fallback, time: "10:00" };
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Cache Intl.DateTimeFormat instances per timezone — construction is ~100x
// more expensive than calling .format(), and these run on every chat turn.
const monthFmtCache = new Map<string, Intl.DateTimeFormat>();
const dayFmtCache = new Map<string, Intl.DateTimeFormat>();
const partsFmtCache = new Map<string, Intl.DateTimeFormat>();

function getMonthFmt(tz: string): Intl.DateTimeFormat {
  let f = monthFmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short" });
    monthFmtCache.set(tz, f);
  }
  return f;
}

function getDayFmt(tz: string): Intl.DateTimeFormat {
  let f = dayFmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { timeZone: tz, day: "numeric" });
    dayFmtCache.set(tz, f);
  }
  return f;
}

function getPartsFmt(tz: string): Intl.DateTimeFormat {
  let f = partsFmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      hourCycle: "h23",
    });
    partsFmtCache.set(tz, f);
  }
  return f;
}

interface ZonedParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  dow: number; // Mon=0..Sun=6
}

// Reads the calendar parts of `date` as observed in `timezone`. The dow is
// derived via getUTCDay() on a UTC reconstruction — locale-independent (no
// reliance on `weekday: "short"` which varies by ICU build).
function zonedDateParts(date: Date, timezone: string): ZonedParts {
  const parts = getPartsFmt(timezone).formatToParts(date);
  const get = (t: string) =>
    parseInt(parts.find((p) => p.type === t)?.value ?? "0", 10);
  const year = get("year");
  const month = get("month");
  const day = get("day");
  const hour = get("hour");
  // Reconstruct as UTC noon on (year/month/day) and read getUTCDay().
  // This is locale-stable (no Intl.weekday parsing).
  const utcAtNoon = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const jsDay = utcAtNoon.getUTCDay(); // Sun=0..Sat=6
  const dow = (jsDay + 6) % 7;
  return { year, month, day, hour, dow };
}

// Returns a Date whose UTC instant matches the given local wall-clock time
// (year/month/day/hour) in the supplied IANA timezone. Iterates the offset
// drift twice to converge cleanly around DST transitions.
function zonedWallTimeToUtcDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  timezone: string
): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, 0, 0));
  for (let pass = 0; pass < 2; pass++) {
    const observed = zonedDateParts(guess, timezone).hour;
    const drift = observed - hour;
    if (drift === 0) break;
    guess.setUTCHours(guess.getUTCHours() - drift);
  }
  return guess;
}

export interface FormattedOccurrence {
  iso: string;
  label: string;
}

// Walks forward day-by-day (up to 8 days) collecting the next `count` distinct
// upcoming slot occurrences in `timezone`. Returns ISO + a display label like
// "Mon Apr 28 at 5:00 PM".
export function formatNextOccurrences(
  slots: NormalizedSlot[],
  count: number,
  now: Date,
  timezone: string
): FormattedOccurrence[] {
  if (slots.length === 0 || count <= 0) return [];

  const tzNow = zonedDateParts(now, timezone);
  const out: FormattedOccurrence[] = [];

  for (let offset = 0; offset <= 8 && out.length < count; offset++) {
    // Compute the calendar Y/M/D `offset` days after today in the user's tz.
    // Anchor at noon UTC then convert — sidesteps the "midnight UTC maps to
    // yesterday in eastern zones" trap and is DST-safe.
    const anchor = new Date(
      Date.UTC(tzNow.year, tzNow.month - 1, tzNow.day + offset, 12, 0, 0)
    );
    const dayInTz = zonedDateParts(anchor, timezone);
    const isToday = offset === 0;
    const daySlots = slots.filter((s) => s.day === dayInTz.dow);
    for (const slot of daySlots) {
      if (out.length >= count) break;
      const utcDate = zonedWallTimeToUtcDate(
        dayInTz.year,
        dayInTz.month,
        dayInTz.day,
        slot.hour,
        timezone
      );
      // Reject anything that's already in the past — works at minute precision
      // and keeps parity with pickNextSlot's strict comparison.
      if (isToday && utcDate.getTime() <= now.getTime()) continue;
      const dayName = DAY_NAMES[slot.day];
      const monthName = getMonthFmt(timezone).format(utcDate);
      const dayNum = getDayFmt(timezone).format(utcDate);
      const hour12 = slot.hour % 12 || 12;
      const ampm = slot.hour < 12 ? "AM" : "PM";
      const label = `${dayName} ${monthName} ${dayNum} at ${hour12}:00 ${ampm}`;
      out.push({ iso: utcDate.toISOString(), label });
    }
  }

  return out;
}
