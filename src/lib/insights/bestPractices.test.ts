import { describe, it, expect } from "vitest";
import { BEST_PRACTICES, getBestPractices } from "@/lib/insights/bestPractices";
import { SUPPORTED_PLATFORMS, PLATFORM_CONFIG } from "@/lib/insights/platformConfig";

describe("best-practices KB completeness", () => {
  it("has exactly one entry per supported platform (no missing, no extra)", () => {
    expect(Object.keys(BEST_PRACTICES).sort()).toEqual([...SUPPORTED_PLATFORMS].sort());
  });

  for (const platform of SUPPORTED_PLATFORMS) {
    describe(platform, () => {
      const kb = getBestPractices(platform)!;

      it("resolves a non-null entry", () => {
        expect(kb).not.toBeNull();
        expect(kb.platform).toBe(platform);
      });

      it("has a sane recommended cadence (0 < min ≤ max)", () => {
        expect(kb.recommendedPostsPerWeek.min).toBeGreaterThan(0);
        expect(kb.recommendedPostsPerWeek.min).toBeLessThanOrEqual(
          kb.recommendedPostsPerWeek.max
        );
      });

      it("describes the role of every format", () => {
        expect(kb.formatMix.length).toBeGreaterThan(0);
        for (const f of kb.formatMix) {
          expect(f.format.trim()).not.toBe("");
          expect(f.role.trim()).not.toBe("");
          expect(f.bestFor.trim()).not.toBe("");
        }
      });

      it("has a cited engagement benchmark with good < strong", () => {
        expect(kb.benchmarkEngagementRate.good).toBeLessThan(
          kb.benchmarkEngagementRate.strong
        );
        expect(kb.benchmarkEngagementRate.basis.trim()).not.toBe("");
        expect(kb.benchmarkEngagementRate.source.trim()).not.toBe("");
      });

      it("has at least one principle and a meaning for engagementRate", () => {
        expect(kb.principles.length).toBeGreaterThan(0);
        expect(kb.metricMeaning.engagementRate?.trim()).toBeTruthy();
      });

      it("reuses platformConfig.defaultBestTimes as the single source of truth", () => {
        expect(kb.bestTimeDefaults).toBe(PLATFORM_CONFIG[platform].defaultBestTimes);
        expect(kb.bestTimeDefaults.length).toBeGreaterThan(0);
      });
    });
  }

  it("returns null for an unsupported platform", () => {
    expect(getBestPractices("tiktok")).toBeNull();
  });
});
