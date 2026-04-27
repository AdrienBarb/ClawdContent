import { insightsV2Schema, type Insights } from "@/lib/schemas/insights";

const HARDCODED_TIME_SLOT_FALLBACK = { dayOfWeek: 0, hour: 9 };

/**
 * Runtime parse of `SocialAccount.insights` (Json column). Returns null when
 * the JSON is missing or fails the v2 schema (e.g. legacy v1 data, manual
 * pollution). Callers should treat null as "no analysed data, use fallbacks".
 */
export function parseInsights(raw: unknown): Insights | null {
  if (raw === null || raw === undefined) return null;
  const parsed = insightsV2Schema.safeParse(raw);
  if (!parsed.success) {
    console.warn(
      `[insightsHelpers] ⚠️  insights JSON failed v2 parse — treating as missing`
    );
    return null;
  }
  return parsed.data;
}

/**
 * Pick `count` (day, hour) slots for new posts. Prefers real best-times from
 * insights, rotates through them, falls back to the platform defaults, and
 * finally to a single hardcoded slot if everything is empty (defensive — a
 * misconfigured platform would otherwise crash with `i % 0 = NaN`).
 */
export function pickTimeSlots(
  insights: Insights | null,
  fallback: { dayOfWeek: number; hour: number }[],
  count: number
): { dayOfWeek: number; hour: number }[] {
  const real = insights?.zernio.bestTimes;
  let source: { dayOfWeek: number; hour: number }[] =
    real && real.length > 0
      ? real.map((t) => ({ dayOfWeek: t.dayOfWeek, hour: t.hour }))
      : fallback;
  if (source.length === 0) {
    source = [HARDCODED_TIME_SLOT_FALLBACK];
  }
  const result: { dayOfWeek: number; hour: number }[] = [];
  for (let i = 0; i < count; i += 1) {
    result.push(source[i % source.length]);
  }
  return result;
}
