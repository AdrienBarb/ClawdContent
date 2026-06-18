import { describe, it, expect } from "vitest";
import {
  rollingNextAnchor,
  generationFireAt,
  todayStart,
  slotToUtc,
} from "@/lib/services/autopilot/time";

const iso = (d: Date) => d.toISOString();
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

describe("rollingNextAnchor", () => {
  it("advances a Monday anchor to the next Monday (UTC)", () => {
    expect(
      iso(rollingNextAnchor(new Date("2026-06-15T00:00:00Z"), "UTC"))
    ).toBe("2026-06-22T00:00:00.000Z");
  });

  it("advances a Thursday anchor to the next Thursday (UTC)", () => {
    expect(
      iso(rollingNextAnchor(new Date("2026-06-18T00:00:00Z"), "UTC"))
    ).toBe("2026-06-25T00:00:00.000Z");
  });

  it("preserves local midnight across a DST fall-back (America/New_York)", () => {
    // 2026-10-29 00:00 EDT (UTC-4) → +7d crosses the Nov 1 fall-back → 2026-11-05
    // 00:00 EST (UTC-5). A naive +168h would land an hour early (still EDT).
    expect(
      iso(
        rollingNextAnchor(
          new Date("2026-10-29T04:00:00Z"),
          "America/New_York"
        )
      )
    ).toBe("2026-11-05T05:00:00.000Z");
  });
});

describe("generationFireAt", () => {
  it("fires 17:00 the evening before a Monday anchor (the old Sunday slot)", () => {
    expect(
      iso(generationFireAt(new Date("2026-06-22T00:00:00Z"), "UTC", 17))
    ).toBe("2026-06-21T17:00:00.000Z");
  });

  it("fires the evening before a Thursday anchor", () => {
    expect(
      iso(generationFireAt(new Date("2026-06-18T00:00:00Z"), "UTC", 17))
    ).toBe("2026-06-17T17:00:00.000Z");
  });
});

describe("slotToUtc — rolling window", () => {
  it("maps a Tuesday slot from a Thursday anchor into the 7-day window", () => {
    const anchor = new Date("2026-06-18T00:00:00Z"); // Thursday
    const now = new Date("2026-06-18T09:00:00Z");
    const at = slotToUtc(anchor, { dayOfWeek: 1, hour: 18 }, "UTC", now);
    expect(iso(at)).toBe("2026-06-23T18:00:00.000Z"); // next Tuesday, day 5/7
    expect(at.getTime()).toBeGreaterThanOrEqual(anchor.getTime());
    expect(at.getTime()).toBeLessThan(anchor.getTime() + WEEK_MS);
  });
});

describe("todayStart", () => {
  it("returns local midnight of the given instant (UTC)", () => {
    expect(iso(todayStart(new Date("2026-06-18T09:00:00Z"), "UTC"))).toBe(
      "2026-06-18T00:00:00.000Z"
    );
  });
});
