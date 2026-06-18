import { z } from "zod";

/**
 * The LLM-authored social growth strategy persisted on `SocialAccount.strategy`.
 *
 * Two schemas, same split as insights (see CLAUDE.md gotcha): a Claude-safe one
 * with NO array length / number bounds (Anthropic `generateObject` rejects
 * `minItems`/`maxItems`/`minimum`/`maximum`), and an internal stored schema with
 * caps we trim to in code. Deliberately rich and meant to evolve.
 */

export const STRATEGY_VERSION = 1;

export const formatActionSchema = z.enum([
  "start",
  "increase",
  "maintain",
  "reduce",
]);

const pillarSchema = z.object({
  name: z.string(),
  description: z.string(),
});

const postIdeaSchema = z.object({
  /** The concrete idea — "a post about X". */
  idea: z.string(),
  /** Suggested format (reel / carousel / photo / story / text…). */
  format: z.string(),
  /** Which content pillar this belongs to. */
  pillar: z.string(),
  /** Why it fits THIS business + their goal. */
  why: z.string(),
});

const formatPlanItemSchema = z.object({
  format: z.string(),
  action: formatActionSchema,
  rationale: z.string(),
});

/** Claude-safe: NO array/number bounds. The model authors these fields. */
export const strategyLLMSchema = z.object({
  positioning: z.string(),
  summary: z.string(),
  contentPillars: z.array(pillarSchema),
  postIdeas: z.array(postIdeaSchema),
  formatPlan: z.array(formatPlanItemSchema),
  doubleDown: z.array(z.string()),
  stop: z.array(z.string()),
  /** Target posts/week — a plain number (no min/max for Anthropic). */
  targetPostsPerWeek: z.number(),
  cadenceRationale: z.string(),
});

export type StrategyLLMOutput = z.infer<typeof strategyLLMSchema>;

const cadencePlanSchema = z.object({
  /** Their real posts/week, or null when we don't have enough history. */
  currentPerWeek: z.number().nullable(),
  /** Target the LLM set, grounded in the recommended band. */
  targetPerWeek: z.number(),
  rationale: z.string(),
  /** Whether the current cadence came from their data or a benchmark. */
  source: z.enum(["account", "benchmark"]),
});

/** Internal stored schema (with caps). Validated before persist + on read. */
export const strategyStoredSchema = z.object({
  version: z.literal(STRATEGY_VERSION),
  generatedAt: z.string(),
  /** Identifier of the engine that wrote it (internal; never user-facing). */
  model: z.string(),
  /** The onboarding goal this strategy was aligned to (null if unset). */
  goal: z.string().nullable(),
  /** Data tier at generation time (rich / thin / cold_start / platform_no_history). */
  dataQuality: z.string(),
  positioning: z.string(),
  summary: z.string(),
  contentPillars: z.array(pillarSchema).max(6),
  postIdeas: z.array(postIdeaSchema).max(12),
  formatPlan: z.array(formatPlanItemSchema).max(8),
  cadence: cadencePlanSchema,
  doubleDown: z.array(z.string()).max(8),
  stop: z.array(z.string()).max(8),
});

export type SocialStrategy = z.infer<typeof strategyStoredSchema>;

/**
 * Runtime parse of `SocialAccount.strategy`. Returns null when missing or when
 * it fails the schema (legacy shape, manual pollution) — callers treat null as
 * "no strategy yet".
 */
export function parseStrategy(raw: unknown): SocialStrategy | null {
  if (raw === null || raw === undefined) return null;
  const parsed = strategyStoredSchema.safeParse(raw);
  if (!parsed.success) {
    console.warn(
      `[strategy] ⚠️  strategy JSON failed parse — treating as missing`
    );
    return null;
  }
  return parsed.data;
}

/**
 * Monotonic rank of a strategy's data tier (higher = built on more real social
 * data). Gates strategy writes so a later cold/thin regeneration — the
 * onboarding Phase-1 pass (knowledgeBase + goal only) or a re-run before
 * Zernio's backfill lands — can never downgrade a richer strategy another job
 * already saved. Equal tiers are allowed to overwrite (a fresh same-tier pass
 * with goal/KB now present supersedes a premature one).
 */
const DATA_QUALITY_RANK: Record<string, number> = {
  platform_no_history: 0,
  cold_start: 0,
  thin: 1,
  rich: 2,
};

export function dataQualityRank(dataQuality: string): number {
  return DATA_QUALITY_RANK[dataQuality] ?? 0;
}

/**
 * The brand-level "business" strategy persisted on `User.businessStrategy`.
 *
 * Same authored shape as the per-account strategy (positioning, summary,
 * pillars, format/cadence plan, double-down/stop) — it's the same `assembleStrategy`
 * output — plus a `kbSource` tag. It's built early in onboarding from the
 * knowledgeBase (or the website-analysis draft) + goal alone, with NO social
 * data, so the paywall can reveal it instantly. `cadence.source` is always
 * `"benchmark"` and `dataQuality` always `"cold_start"` (no insights feed it).
 */
export const businessStrategyStoredSchema = strategyStoredSchema.extend({
  /**
   * Which knowledgeBase tier this was built from. Guards the step-3 (draft) →
   * step-4 (confirmed) race: a draft-built strategy must never clobber a
   * confirmed-built one if its generation finishes later. Defaults to
   * "confirmed" so a legacy row without the tag is treated as authoritative.
   */
  kbSource: z.enum(["draft", "confirmed"]).default("confirmed"),
});

export type BusinessStrategy = z.infer<typeof businessStrategyStoredSchema>;

/**
 * Runtime parse of `User.businessStrategy`. Returns null when missing or when
 * it fails the schema — callers treat null as "no business strategy yet" (the
 * paywall stays in its "building" state and the client keeps polling).
 */
export function parseBusinessStrategy(raw: unknown): BusinessStrategy | null {
  if (raw === null || raw === undefined) return null;
  const parsed = businessStrategyStoredSchema.safeParse(raw);
  if (!parsed.success) {
    console.warn(
      `[strategy] ⚠️  businessStrategy JSON failed parse — treating as missing`
    );
    return null;
  }
  return parsed.data;
}

/**
 * Monotonic rank of a business strategy's knowledgeBase tier (higher = built on
 * more authoritative facts). Confirmed always beats draft; equal tiers overwrite
 * (a step-4 re-edit with corrected facts supersedes a premature build).
 */
const KB_SOURCE_RANK: Record<string, number> = {
  draft: 0,
  confirmed: 1,
};

export function kbSourceRank(kbSource: string): number {
  return KB_SOURCE_RANK[kbSource] ?? 0;
}
