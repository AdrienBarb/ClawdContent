import { isSupportedPlatform } from "@/lib/insights/platformConfig";
import { parseInsights } from "@/lib/services/insightsHelpers";
import { parseStrategy, type SocialStrategy } from "@/lib/schemas/strategy";
import type { DataQuality } from "@/lib/schemas/insights";
import type { OnboardingGoal } from "@/lib/schemas/onboarding";
import type {
  PaywallPlan,
  PaywallPlanAfter,
} from "@/lib/schemas/onboardingPlan";

/**
 * Pure assembly of the paywall view-model (strategy-only — no before/after). NO
 * prisma / inngest / AI-SDK imports — so the unit test can import it (see
 * vitest.config.ts). The service layer (`services/onboardingPlan.ts`) does the DB
 * read + primary-account selection, then hands rows here.
 */

/** A `SocialAccount` row slice the plan builder needs. `insights`/`strategy` are raw JSON. */
export interface RawAccountInput {
  id: string;
  platform: string;
  username: string;
  analysisStatus: string;
  insights: unknown;
  strategy: unknown;
  /** Tiebreaker for primary-account selection (oldest first). */
  createdAt: Date | string;
}

const GOAL_LABELS: Record<OnboardingGoal, string> = {
  find_customers: "get found by new customers",
  build_community: "build a loyal community",
  brand_awareness: "get your name out there",
  authority: "become the go-to expert in your space",
};

export function goalLabel(goal: OnboardingGoal | null): string | null {
  if (!goal) return null;
  return GOAL_LABELS[goal] ?? null;
}

/** Map a raw strategy/insights format key to a human label. */
export function formatLabel(format: string): string {
  const f = format.toLowerCase().trim();
  if (f.includes("reel")) return "Reels";
  if (f.includes("carousel")) return "Carousels";
  if (f.includes("story") || f.includes("stories")) return "Stories";
  if (f === "video") return "Video";
  if (f === "image" || f.includes("photo") || f === "picture") return "Photos";
  if (f === "text" || f === "post" || f === "status") return "Posts";
  if (f === "link") return "Links";
  return f ? f.charAt(0).toUpperCase() + f.slice(1) : "Posts";
}

/** Lower = surfaced first. Reels/Carousels lead the "after" formats. */
const FORMAT_PRIORITY: Record<string, number> = {
  Reels: 0,
  Carousels: 1,
  Video: 2,
  Photos: 3,
  Posts: 4,
};

/**
 * Zernio cannot publish Stories, so a plan must never promise them. New
 * strategies are already filtered at generation (assembleStrategy guard); this
 * read-time check also scrubs strategies stored before that guard existed.
 */
function isPublishableLabel(label: string): boolean {
  return label !== "Stories";
}

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values));
}

function dataQualityOf(account: RawAccountInput): DataQuality {
  return parseInsights(account.insights)?.meta.dataQuality ?? "cold_start";
}

const TIER_RANK: Record<DataQuality, number> = {
  rich: 0,
  thin: 1,
  cold_start: 2,
  platform_no_history: 3,
};

function platformRank(platform: string): number {
  const p = platform.toLowerCase();
  if (p === "instagram") return 0;
  if (p === "facebook") return 1;
  return 2;
}

/**
 * Pick the primary account whose handle the reveal shows (header fallback +
 * loading copy): prefer one whose strategy is already written, then the richest
 * data tier, then Instagram, then the oldest connection. Returns null when no
 * supported account exists.
 */
export function selectPrimaryAccount(
  accounts: RawAccountInput[]
): RawAccountInput | null {
  const supported = accounts.filter((a) => isSupportedPlatform(a.platform));
  if (supported.length === 0) return null;

  return [...supported].sort((a, b) => {
    const aReady = parseStrategy(a.strategy) ? 0 : 1;
    const bReady = parseStrategy(b.strategy) ? 0 : 1;
    if (aReady !== bReady) return aReady - bReady;

    const tier = TIER_RANK[dataQualityOf(a)] - TIER_RANK[dataQualityOf(b)];
    if (tier !== 0) return tier;

    const plat = platformRank(a.platform) - platformRank(b.platform);
    if (plat !== 0) return plat;

    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  })[0];
}

/**
 * Build the "after" plan from an authored strategy. Now fed by the brand-level
 * `User.businessStrategy` (not the per-account `SocialAccount.strategy`), so the
 * paywall reveal is ready as soon as the business strategy lands — no social
 * analysis wait. The shape is unchanged, so the `Plan*` components stay compatible.
 */
function buildAfterFromStrategy(strategy: SocialStrategy): PaywallPlanAfter {
  const formatPlan = strategy.formatPlan
    .map((f) => ({
      format: f.format,
      label: formatLabel(f.format),
      action: f.action,
      rationale: f.rationale,
    }))
    .filter((f) => isPublishableLabel(f.label));

  const newFormatLabels = dedupe(
    formatPlan
      .filter((f) => f.action === "start" || f.action === "increase")
      .map((f) => f.label)
  );

  const targetFormatLabels = dedupe(
    formatPlan.filter((f) => f.action !== "reduce").map((f) => f.label)
  )
    .sort((a, b) => (FORMAT_PRIORITY[a] ?? 9) - (FORMAT_PRIORITY[b] ?? 9))
    .slice(0, 3);

  const ideas = strategy.postIdeas
    .filter((p) => isPublishableLabel(formatLabel(p.format)))
    .slice(0, 3)
    .map((p) => ({
      idea: p.idea,
      format: p.format,
      formatLabel: formatLabel(p.format),
      pillar: p.pillar,
    }));

  return {
    postsPerWeek: strategy.cadence.targetPerWeek,
    cadenceRationale: strategy.cadence.rationale,
    targetFormatLabels:
      targetFormatLabels.length > 0 ? targetFormatLabels : newFormatLabels,
    newFormatLabels,
    formatPlan,
    pillars: strategy.contentPillars,
    ideas,
    doubleDown: strategy.doubleDown,
    stop: strategy.stop,
    positioning: strategy.positioning,
    summary: strategy.summary,
  };
}

/**
 * Assemble the view-model. It's purely the brand-level `businessStrategy`
 * ("after", ready instantly) — there is deliberately NO before/after on this
 * step. `account` carries the primary handle for the header fallback / loading
 * copy; it's null when no supported account is connected.
 */
export function buildPaywallPlan(input: {
  account: RawAccountInput | null;
  businessStrategy: SocialStrategy | null;
  goal: OnboardingGoal | null;
  businessName: string | null;
}): PaywallPlan {
  const { account, businessStrategy, goal, businessName } = input;

  const after = businessStrategy
    ? buildAfterFromStrategy(businessStrategy)
    : null;

  return {
    status: after ? "ready" : "building",
    account: account
      ? {
          platform: account.platform,
          handle: account.username.replace(/^@/, ""),
        }
      : null,
    businessName,
    goal,
    goalLabel: goalLabel(goal),
    after,
  };
}
