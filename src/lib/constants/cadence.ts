/**
 * Per-platform posts-per-week defaults sourced from spec D-decisions and
 * 2025-2026 industry benchmarks. `null` means generation is disabled in v1
 * (video-only platforms — TikTok and YouTube).
 *
 * Lives in `constants/` rather than `services/` because the onboarding UI
 * (a client component) needs to render the default cadence per platform,
 * and pulling it from `services/strategy.ts` would drag Prisma into the
 * browser bundle.
 */
export const DEFAULT_CADENCE: Record<string, number | null> = {
  instagram: 4,
  facebook: 2,
  twitter: 21,
  linkedin: 3,
  pinterest: 7,
  threads: 3,
  bluesky: 3,
  tiktok: null,
  youtube: null,
};
