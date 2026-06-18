import { describe, it, expect } from "vitest";
import {
  computeDueAnchor,
  planSlotDates,
  type LatestBatchInfo,
} from "@/lib/services/autopilot/schedule";

const iso = (d: Date) => d.toISOString();
const TZ = "UTC";
const HOUR = 17;
const MAX = 3;

describe("computeDueAnchor", () => {
  it("bootstraps a window starting today when no batch exists", () => {
    const r = computeDueAnchor({
      latest: null,
      now: new Date("2026-06-18T09:00:00Z"), // Thursday
      timeZone: TZ,
      dispatchHour: HOUR,
      maxAttempts: MAX,
    });
    expect(r.kind).toBe("bootstrap");
    expect(r.due).toBe(true);
    expect(iso(r.anchor)).toBe("2026-06-18T00:00:00.000Z");
  });

  it("advances to anchor+7d once the eve-of-window fire time passes", () => {
    const latest: LatestBatchInfo = {
      weekStart: new Date("2026-06-15T00:00:00Z"), // Monday
      status: "ready",
      attempts: 1,
      posts: [{}],
      updatedAt: new Date("2026-06-15T00:05:00Z"),
    };
    const r = computeDueAnchor({
      latest,
      now: new Date("2026-06-21T18:00:00Z"), // Sunday, after 17:00 fire
      timeZone: TZ,
      dispatchHour: HOUR,
      maxAttempts: MAX,
    });
    expect(r.kind).toBe("advance");
    expect(iso(r.anchor)).toBe("2026-06-22T00:00:00.000Z");
    expect(r.due).toBe(true);
  });

  it("is not due before the eve-of-window fire time", () => {
    const latest: LatestBatchInfo = {
      weekStart: new Date("2026-06-15T00:00:00Z"),
      status: "ready",
      attempts: 1,
      posts: [{}],
      updatedAt: new Date("2026-06-15T00:05:00Z"),
    };
    const r = computeDueAnchor({
      latest,
      now: new Date("2026-06-21T16:00:00Z"), // Sunday, before 17:00 fire
      timeZone: TZ,
      dispatchHour: HOUR,
      maxAttempts: MAX,
    });
    expect(r.kind).toBe("advance");
    expect(r.due).toBe(false);
  });

  it("retries the same window when failed with budget and no commit marker", () => {
    const latest: LatestBatchInfo = {
      weekStart: new Date("2026-06-22T00:00:00Z"),
      status: "failed",
      attempts: 1,
      posts: null,
      updatedAt: new Date("2026-06-22T00:10:00Z"),
    };
    const r = computeDueAnchor({
      latest,
      now: new Date("2026-06-22T09:00:00Z"),
      timeZone: TZ,
      dispatchHour: HOUR,
      maxAttempts: MAX,
    });
    expect(r.kind).toBe("retry");
    expect(iso(r.anchor)).toBe("2026-06-22T00:00:00.000Z");
    expect(r.due).toBe(true);
  });

  it("advances past a failed window that exhausted its attempts", () => {
    const latest: LatestBatchInfo = {
      weekStart: new Date("2026-06-22T00:00:00Z"),
      status: "failed",
      attempts: MAX,
      posts: null,
      updatedAt: new Date("2026-06-22T00:10:00Z"),
    };
    const r = computeDueAnchor({
      latest,
      now: new Date("2026-06-29T18:00:00Z"),
      timeZone: TZ,
      dispatchHour: HOUR,
      maxAttempts: MAX,
    });
    expect(r.kind).toBe("advance");
    expect(iso(r.anchor)).toBe("2026-06-29T00:00:00.000Z");
  });

  it("advances past a failed window already in commit phase (posts !== null)", () => {
    const latest: LatestBatchInfo = {
      weekStart: new Date("2026-06-22T00:00:00Z"),
      status: "failed",
      attempts: 1,
      posts: [], // commit-phase firewall marker — never re-armed
      updatedAt: new Date("2026-06-22T00:10:00Z"),
    };
    const r = computeDueAnchor({
      latest,
      now: new Date("2026-06-29T18:00:00Z"),
      timeZone: TZ,
      dispatchHour: HOUR,
      maxAttempts: MAX,
    });
    expect(r.kind).toBe("advance");
  });

  it("never stacks while a build is freshly in flight", () => {
    const latest: LatestBatchInfo = {
      weekStart: new Date("2026-06-22T00:00:00Z"),
      status: "generating",
      attempts: 1,
      posts: null,
      updatedAt: new Date("2026-06-22T08:30:00Z"), // 30 min before now — fresh
    };
    const r = computeDueAnchor({
      latest,
      now: new Date("2026-06-22T09:00:00Z"),
      timeZone: TZ,
      dispatchHour: HOUR,
      maxAttempts: MAX,
    });
    expect(r.kind).toBe("wait");
    expect(r.due).toBe(false);
  });

  it("advances past a wedged 'generating' batch stuck far past any real run", () => {
    const latest: LatestBatchInfo = {
      weekStart: new Date("2026-06-22T00:00:00Z"),
      status: "generating",
      attempts: 1,
      posts: null,
      updatedAt: new Date("2026-06-22T05:00:00Z"), // stuck since the 22nd
    };
    const r = computeDueAnchor({
      latest,
      now: new Date("2026-06-28T18:00:00Z"), // days later, well past STALE
      timeZone: TZ,
      dispatchHour: HOUR,
      maxAttempts: MAX,
    });
    expect(r.kind).toBe("advance");
    expect(iso(r.anchor)).toBe("2026-06-29T00:00:00.000Z");
    expect(r.due).toBe(true);
  });
});

describe("planSlotDates", () => {
  const anchor = new Date("2026-06-18T00:00:00Z"); // Thursday
  const now = new Date("2026-06-18T09:00:00Z");
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const inWindow = (d: Date) =>
    d.getTime() >= anchor.getTime() &&
    d.getTime() < anchor.getTime() + WEEK_MS;

  it("places cold-start Instagram defaults entirely inside the rolling window", () => {
    const slots = [
      { dayOfWeek: 1, hour: 18 }, // Tue
      { dayOfWeek: 3, hour: 11 }, // Thu
      { dayOfWeek: 5, hour: 10 }, // Sat
    ];
    const planned = planSlotDates({ anchor, slots, timeZone: TZ, now });
    expect(planned).toHaveLength(3);
    expect(planned.every((p) => inWindow(p.scheduledAt))).toBe(true);
    expect(new Set(planned.map((p) => p.dayOfWeek)).size).toBe(3);
    expect(planned.map((p) => p.index)).toEqual([0, 1, 2]);
  });

  it("places cold-start Facebook defaults entirely inside the rolling window", () => {
    const slots = [
      { dayOfWeek: 2, hour: 13 }, // Wed
      { dayOfWeek: 3, hour: 19 }, // Thu
      { dayOfWeek: 6, hour: 11 }, // Sun
    ];
    const planned = planSlotDates({ anchor, slots, timeZone: TZ, now });
    expect(planned).toHaveLength(3);
    expect(planned.every((p) => inWindow(p.scheduledAt))).toBe(true);
    expect(new Set(planned.map((p) => p.dayOfWeek)).size).toBe(3);
  });

  it("spreads cycled (repeated-day) slots onto distinct days, all in window", () => {
    const slots = [
      { dayOfWeek: 1, hour: 18 },
      { dayOfWeek: 3, hour: 11 },
      { dayOfWeek: 5, hour: 10 },
      { dayOfWeek: 1, hour: 18 }, // repeat → shifts to a free day
      { dayOfWeek: 3, hour: 11 }, // repeat → shifts to a free day
    ];
    const planned = planSlotDates({ anchor, slots, timeZone: TZ, now });
    expect(planned).toHaveLength(5);
    expect(new Set(planned.map((p) => p.dayOfWeek)).size).toBe(5);
    expect(planned.every((p) => inWindow(p.scheduledAt))).toBe(true);
  });

  it("clamps an out-of-window slot but keeps each survivor's source index", () => {
    // Generated very late in the window: a Monday slot bumps forward past the
    // window end and is dropped, while a later Sunday slot survives. The
    // survivor must keep index 1 (NOT collapse to 0) so the caller pairs the
    // right post with it.
    const lateAnchor = new Date("2026-06-15T00:00:00Z"); // Monday
    const lateNow = new Date("2026-06-21T18:00:00Z"); // Sunday, day 6 of window
    const slots = [
      { dayOfWeek: 0, hour: 9 }, // Mon 09:00 → bumps to next Mon → out of window
      { dayOfWeek: 6, hour: 20 }, // Sun 20:00 → still ahead → survives
    ];
    const planned = planSlotDates({
      anchor: lateAnchor,
      slots,
      timeZone: TZ,
      now: lateNow,
    });
    expect(planned).toHaveLength(1);
    expect(planned[0].index).toBe(1);
    expect(planned[0].scheduledAt.getTime()).toBeLessThan(
      lateAnchor.getTime() + WEEK_MS
    );
  });
});
