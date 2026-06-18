import type { Insights, StoredPost } from "@/lib/schemas/insights";
import type { PlatformBestPractices } from "@/lib/insights/bestPractices";
import {
  resolveCadence,
  resolveBestTimes,
  type ResolvedCadence,
  type ResolvedBestTimes,
} from "@/lib/insights/resolve";
import {
  formatBusinessContext,
  formatGoalContext,
  formatStrategyContext,
} from "@/lib/services/promptContext";
import { formatLabel } from "@/lib/insights/paywallPlan";
import {
  STRATEGY_VERSION,
  type StrategyLLMOutput,
  type SocialStrategy,
} from "@/lib/schemas/strategy";

/**
 * Deterministic strategy plumbing — kept pure (no DB / no AI) so it's fully
 * unit-testable and so the LLM is grounded in facts, not vibes:
 *  - `buildStrategyInputs` assembles the factual inputs from insights + KB + goal
 *  - `buildStrategyPrompt` renders those inputs into the prompt
 *  - `assembleStrategy` merges the LLM output with the deterministic facts (caps
 *    arrays, stamps the real cadence/source) into the stored shape
 *
 * The impure orchestrator (`src/lib/services/socialStrategy.ts`) wires these to
 * the DB and the model.
 */

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export interface StrategyInputs {
  platform: string;
  displayName: string;
  goal: string | null;
  dataQuality: string;
  postsAnalyzed: number;
  followersCount: number | null;
  growth30d: number | null;
  /** True mean engagementRate across all fetched posts, or null when none. */
  avgEngagementRate: number | null;
  cadence: ResolvedCadence;
  bestTimes: ResolvedBestTimes;
  contentMixActual: { type: string; percentage: number }[];
  topPosts: StoredPost[];
  bottomPosts: StoredPost[];
  voice: { tone: string; topics: string[]; patterns: string[] } | null;
  kb: PlatformBestPractices;
}

export function buildStrategyInputs(args: {
  platform: string;
  insights: Insights | null;
  goal: string | null;
  kb: PlatformBestPractices;
}): StrategyInputs {
  const { platform, insights, goal, kb } = args;
  const top = insights?.zernio.topPosts ?? [];
  const bottom = insights?.zernio.bottomPosts ?? [];
  const inferred = insights?.inferred ?? null;

  return {
    platform,
    displayName: kb.displayName,
    goal,
    dataQuality: insights?.meta.dataQuality ?? "cold_start",
    postsAnalyzed: insights?.meta.postsAnalyzed ?? 0,
    followersCount: insights?.zernio.account.followersCount ?? null,
    growth30d: insights?.zernio.account.growth30d ?? null,
    avgEngagementRate: insights?.computed.avgEngagementRate ?? null,
    cadence: resolveCadence(insights, kb),
    bestTimes: resolveBestTimes(insights, kb),
    contentMixActual: insights?.computed.contentMix ?? [],
    topPosts: top,
    bottomPosts: bottom,
    voice: inferred
      ? {
          tone: inferred.toneSummary,
          topics: inferred.topics,
          patterns: inferred.performingPatterns,
        }
      : null,
    kb,
  };
}

function formatPostLine(p: StoredPost): string {
  const excerpt = p.content.replace(/\s+/g, " ").trim().slice(0, 180);
  const m = p.metrics;
  const watch = m.igReelsAvgWatchTime > 0 ? ` watch:${m.igReelsAvgWatchTime}s` : "";
  return `- [${p.mediaType ?? "post"} · ER ${m.engagementRate}% · ${m.likes}❤ ${m.comments}💬 ${m.shares}↗ ${m.saves}🔖${watch}] ${excerpt}`;
}

function formatTimes(times: { dayOfWeek: number; hour: number }[]): string {
  return times
    .map((t) => `${DAY_NAMES[t.dayOfWeek] ?? `D${t.dayOfWeek}`} ${t.hour}:00`)
    .join(", ");
}

/**
 * Push the account-status sections (real follower/cadence/engagement numbers,
 * top/bottom posts, inferred voice) onto the prompt. ACCOUNT MODE ONLY — these
 * describe a live social account from its insights. Brand mode has none and
 * skips this entirely (see `buildStrategyPrompt`).
 */
function pushAccountStatusSections(
  sections: string[],
  inputs: StrategyInputs
): void {
  const { kb } = inputs;

  // --- Where they are now (facts) ---
  const nowLines: string[] = [`## Where they are now (${inputs.displayName})`];
  nowLines.push(
    `- Followers: ${inputs.followersCount ?? "unknown"}${
      inputs.growth30d !== null ? ` (30-day change: ${inputs.growth30d >= 0 ? "+" : ""}${inputs.growth30d})` : ""
    }`
  );
  nowLines.push(
    inputs.cadence.actualPostsPerWeek !== null
      ? `- They currently post ~${inputs.cadence.actualPostsPerWeek}×/week${
          inputs.cadence.source === "benchmark" ? " (limited history — treat as rough)" : ""
        }`
      : `- Posting cadence: not enough history yet`
  );
  nowLines.push(
    `- Recommended cadence for ${inputs.displayName}: ${kb.recommendedPostsPerWeek.min}-${kb.recommendedPostsPerWeek.max}×/week`
  );
  nowLines.push(
    inputs.avgEngagementRate !== null
      ? `- Their average engagement rate across recent posts: ${inputs.avgEngagementRate}% (healthy here is ${kb.benchmarkEngagementRate.good}%+, strong is ${kb.benchmarkEngagementRate.strong}%+)`
      : `- Engagement rate: no data yet (healthy here is ${kb.benchmarkEngagementRate.good}%+)`
  );
  if (inputs.contentMixActual.length > 0) {
    nowLines.push(
      `- Their current format mix: ${inputs.contentMixActual
        .map((c) => `${c.type} ${c.percentage}%`)
        .join(", ")}`
    );
  }
  nowLines.push(
    `- Recommended format mix: ${kb.formatMix.map((f) => `${f.format} = ${f.role}`).join("; ")}`
  );
  nowLines.push(
    `- Suggested posting times (UTC, ${inputs.bestTimes.source === "account" ? "from their data" : "best-practice"}): ${formatTimes(inputs.bestTimes.times)}`
  );
  sections.push(nowLines.join("\n"));

  // --- What's working / not ---
  if (inputs.topPosts.length > 0) {
    sections.push(
      `## What's working (top posts by engagement)\n${inputs.topPosts.map(formatPostLine).join("\n")}`
    );
  }
  if (inputs.bottomPosts.length > 0) {
    sections.push(
      `## What's underperforming (weakest posts)\n${inputs.bottomPosts.map(formatPostLine).join("\n")}`
    );
  } else {
    sections.push(
      `## What's underperforming\nNot enough published posts yet to identify weak performers — base "stop" advice on ${inputs.displayName} best practices.`
    );
  }

  // --- Voice ---
  if (inputs.voice) {
    const v = inputs.voice;
    sections.push(
      `## Their voice\nTone: ${v.tone}${v.topics.length ? `\nTopics: ${v.topics.join(", ")}` : ""}${
        v.patterns.length ? `\nWhat performs: ${v.patterns.join("; ")}` : ""
      }`
    );
  }
}

export function buildStrategyPrompt(
  inputs: StrategyInputs,
  knowledgeBase: Record<string, unknown> | null,
  /**
   * Optional brand-level strategy to align this per-account plan to. When the
   * onboarding business strategy exists, the per-account (network) strategy is
   * anchored to it so positioning/pillars stay consistent across accounts.
   * Omitted for the brand-strategy build itself (there's nothing to anchor to).
   */
  businessStrategy?: SocialStrategy | null
): string {
  const { kb } = inputs;
  // Brand mode (the onboarding business strategy) has NO social data — no
  // insights, no platform. The account-status sections below ("Where they are
  // now", "What's working/underperforming", "Their voice") would all degrade to
  // "no followers / not enough history yet / no posts yet" and the model would
  // dutifully repeat that ("starting fresh with no post history yet"). So in
  // brand mode we skip them entirely and steer purely from the business + goal.
  const isBrand = inputs.platform === "brand";
  const sections: string[] = [];

  sections.push(
    isBrand
      ? `You are an expert brand strategist building a brand-level content strategy for a small business that will publish on ${inputs.displayName}. Base every recommendation on what this business actually does and the goal below. Be specific to this business, never generic. This is the opening plan for a business that is about to start posting, so frame it as where to begin — never claim to know how they have posted before, and never say they have no history. Never mention that any of this is automated or AI-generated.`
      : `You are an expert social media manager building a concrete growth strategy for a small business's ${inputs.displayName} account. Ground every recommendation in THEIR real numbers below — cite them. Be specific to this business, never generic. Never mention that any of this is automated or AI-generated.`
  );

  sections.push(formatBusinessContext(knowledgeBase));

  const goalBlock = formatGoalContext(inputs.goal);
  if (goalBlock) sections.push(goalBlock);

  // Anchor to the brand-level strategy (if one exists) so this account's plan
  // stays consistent with the umbrella positioning/pillars rather than drifting.
  const brandBlock = businessStrategy
    ? formatStrategyContext(businessStrategy, { withHeader: false })
    : "";
  if (brandBlock) {
    sections.push(
      `## Brand-level strategy (keep this account aligned to it)\n${brandBlock}`
    );
  }

  if (isBrand) {
    sections.push(
      `## Starting point for ${inputs.displayName}\n- Recommended cadence to begin with: ${kb.recommendedPostsPerWeek.min}-${kb.recommendedPostsPerWeek.max}×/week.\n- Recommended format mix: ${kb.formatMix
        .map((f) => `${f.format} = ${f.role}`)
        .join("; ")}`
    );
  } else {
    pushAccountStatusSections(sections, inputs);
  }

  sections.push(`## ${inputs.displayName} principles\n${kb.principles.map((p) => `- ${p}`).join("\n")}`);

  // --- Task ---
  const publishableFormats = kb.formatMix.map((f) => f.format).join(", ");
  sections.push(`## Your task
Produce a growth strategy as a JSON object, aligned to their PRIMARY GOAL and grounded in the numbers above:
- positioning: 2-3 sentences on how this business should show up on ${inputs.displayName} to hit their goal.
- contentPillars: 3-5 recurring themes (name + one-line description) rooted in their services and goal.
- postIdeas: 5-8 concrete, ready-to-act ideas. Each names a SPECIFIC topic ("a post about …"), a format, the pillar it belongs to, and WHY it fits their goal/audience.
- formatPlan: one entry per format from the publishable list below, an action (start | increase | maintain | reduce) + a one-line rationale tied to the mix gap or what's working.
- doubleDown: 2-4 things their data shows are working — do more of these. If there's no data yet, base on best practices.
- stop: 1-3 things to stop or fix (from weak posts or format gaps). If no data, base on best practices.
- targetPostsPerWeek: a single realistic number, moving them toward the recommended band (don't overshoot for a busy owner).
- cadenceRationale: one sentence explaining the cadence move.
- summary: a 1-2 sentence TL;DR the owner reads first.

We can only publish these ${inputs.displayName} formats for them: ${publishableFormats}. Every postIdeas format and every formatPlan format MUST be one of these. Never recommend Stories, Lives, or any other format anywhere in the strategy (including formatPlan, postIdeas, doubleDown, stop, positioning, and summary).

Write in the same language as the business context. Be concrete and specific to THIS business. Use plain, everyday language a busy small business owner understands. Do not use em dashes or en dashes anywhere; use commas, periods, or parentheses instead.`);

  return sections.join("\n\n");
}

/**
 * Merge the LLM output with the deterministic facts into the stored shape.
 * Caps arrays (Anthropic can't enforce maxItems) and stamps the REAL cadence
 * (currentPerWeek + source) rather than trusting the model to restate it.
 */
export function assembleStrategy(
  llm: StrategyLLMOutput,
  inputs: StrategyInputs,
  generatedAt: string,
  model: string
): SocialStrategy {
  // Hard guard: only formats from the platform KB (plus plain feed video) are
  // publishable through Zernio. Drop anything else the model slipped in — e.g.
  // Stories — so an unpublishable recommendation can never reach the UI.
  // Compared post-normalisation, so "Story" / "stories" / "Stories" all match.
  const publishable = new Set(inputs.kb.formatMix.map((f) => formatLabel(f.format)));
  publishable.add("Video"); // feed video is always publishable (an IG video IS a Reel)
  const isPublishable = (format: string) => publishable.has(formatLabel(format));

  return {
    version: STRATEGY_VERSION,
    generatedAt,
    model,
    goal: inputs.goal,
    dataQuality: inputs.dataQuality,
    positioning: llm.positioning,
    summary: llm.summary,
    contentPillars: llm.contentPillars.slice(0, 6),
    postIdeas: llm.postIdeas.filter((p) => isPublishable(p.format)).slice(0, 12),
    formatPlan: llm.formatPlan.filter((f) => isPublishable(f.format)).slice(0, 8),
    cadence: {
      currentPerWeek: inputs.cadence.actualPostsPerWeek,
      targetPerWeek: llm.targetPostsPerWeek,
      rationale: llm.cadenceRationale,
      source: inputs.cadence.source,
    },
    doubleDown: llm.doubleDown.slice(0, 8),
    stop: llm.stop.slice(0, 8),
  };
}
