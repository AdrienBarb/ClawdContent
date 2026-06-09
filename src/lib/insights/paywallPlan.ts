import { isSupportedPlatform } from "@/lib/insights/platformConfig";
import { parseInsights } from "@/lib/services/insightsHelpers";
import { parseStrategy } from "@/lib/schemas/strategy";
import type { DataQuality } from "@/lib/schemas/insights";
import type { OnboardingGoal } from "@/lib/schemas/onboarding";
import type {
  PaywallPlan,
  PaywallPlanAfter,
  PaywallPlanBefore,
} from "@/lib/schemas/onboardingPlan";

/**
 * Pure assembly of the paywall before/after view-model. NO prisma / inngest /
 * AI-SDK imports — so the unit test can import it (see vitest.config.ts). The
 * service layer (`services/onboardingPlan.ts`) does the DB read + selection,
 * then hands rows here.
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

/**
 * Whether a content-mix entry is a Reel. `mediaType` can't distinguish an IG
 * Reel from an FB feed video — both arrive as "video" — so we only treat plain
 * "video" as a Reel on Instagram (where video IS a Reel). This keeps the honest
 * "no Reels" diagnosis from ever firing incorrectly on a Facebook video poster.
 */
function isReelLike(type: string, supportsReels: boolean): boolean {
  const t = type.toLowerCase();
  return t.includes("reel") || (supportsReels && t === "video");
}

/** Lower = surfaced first. Reels/Carousels lead the "after" formats. */
const FORMAT_PRIORITY: Record<string, number> = {
  Reels: 0,
  Carousels: 1,
  Video: 2,
  Photos: 3,
  Stories: 4,
  Posts: 5,
};

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
 * Pick the account that will make the most compelling reveal: prefer one whose
 * strategy is already written, then the richest data tier, then Instagram, then
 * the oldest connection. Returns null when no supported account exists.
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

/** Build the honest "before" fragments. Reads like "Today you're ___". */
export function buildDiagnosis(args: {
  dataQuality: DataQuality;
  postsPerWeek: number | null;
  topFormatLabel: string | null;
  topFormatPct: number;
  hasReels: boolean;
  /** Whether the platform has Reels (Instagram) — gates the "no Reels" callout. */
  supportsReels: boolean;
}): string[] {
  const {
    dataQuality,
    postsPerWeek,
    topFormatLabel,
    topFormatPct,
    hasReels,
    supportsReels,
  } = args;

  if (dataQuality === "cold_start" || dataQuality === "platform_no_history") {
    return ["just getting started — no posts to learn from yet"];
  }

  const out: string[] = [];

  if (postsPerWeek === null) {
    out.push("posting without a steady rhythm");
  } else if (postsPerWeek < 1) {
    out.push("posting less than once a week");
  } else {
    out.push(`posting about ${postsPerWeek}×/week`);
  }

  if (topFormatLabel) {
    const lead = topFormatPct >= 60 ? `${topFormatPct}% ` : "mostly ";
    // Only call out "no Reels" where Reels exist and they aren't using them.
    const noReels = supportsReels && !hasReels ? ", no Reels" : "";
    out.push(`${lead}${topFormatLabel.toLowerCase()}${noReels}`);
  }

  out.push("without a repeating content plan");
  return out;
}

function buildBefore(account: RawAccountInput): {
  before: PaywallPlanBefore;
  dataQuality: DataQuality;
} {
  const insights = parseInsights(account.insights);
  const strategy = parseStrategy(account.strategy);
  const dataQuality: DataQuality = insights?.meta.dataQuality ?? "cold_start";
  const supportsReels = account.platform.toLowerCase() === "instagram";

  const freq = insights?.zernio.postingFrequency?.avgPostsPerWeek;
  const postsPerWeek =
    typeof freq === "number"
      ? Math.round(freq)
      : (strategy?.cadence.currentPerWeek ?? null);

  // On Instagram a "video" IS a Reel — label it as such; everywhere else it's
  // plain video. Keeps the "Today" column and diagnosis honest per platform.
  const mixLabel = (type: string) =>
    supportsReels && type.toLowerCase() === "video"
      ? "Reels"
      : formatLabel(type);

  const contentMix = (insights?.computed.contentMix ?? [])
    .map((c) => ({
      type: c.type,
      label: mixLabel(c.type),
      percentage: Math.round(c.percentage),
    }))
    .sort((a, b) => b.percentage - a.percentage);

  const topFormatLabel = contentMix.length > 0 ? contentMix[0].label : null;
  const topFormatPct = contentMix.length > 0 ? contentMix[0].percentage : 0;
  const hasReels = contentMix.some((c) => isReelLike(c.type, supportsReels));

  const before: PaywallPlanBefore = {
    postsPerWeek,
    followers: insights?.zernio.account.followersCount ?? null,
    avgEngagement: insights?.computed.avgEngagementRate ?? null,
    contentMix,
    topFormatLabel,
    hasReels,
    diagnosis: buildDiagnosis({
      dataQuality,
      postsPerWeek,
      topFormatLabel,
      topFormatPct,
      hasReels,
      supportsReels,
    }),
  };

  return { before, dataQuality };
}

function buildAfter(account: RawAccountInput): PaywallPlanAfter | null {
  const strategy = parseStrategy(account.strategy);
  if (!strategy) return null;

  const formatPlan = strategy.formatPlan.map((f) => ({
    format: f.format,
    label: formatLabel(f.format),
    action: f.action,
    rationale: f.rationale,
  }));

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

  const ideas = strategy.postIdeas.slice(0, 3).map((p) => ({
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

/** Assemble the full view-model for one already-selected account. */
export function buildPaywallPlan(input: {
  account: RawAccountInput;
  goal: OnboardingGoal | null;
  businessName: string | null;
}): PaywallPlan {
  const { account, goal, businessName } = input;
  const { before, dataQuality } = buildBefore(account);
  const after = buildAfter(account);

  return {
    status: after ? "ready" : "building",
    account: {
      platform: account.platform,
      handle: account.username.replace(/^@/, ""),
    },
    businessName,
    goal,
    goalLabel: goalLabel(goal),
    dataQuality,
    before,
    after,
  };
}
