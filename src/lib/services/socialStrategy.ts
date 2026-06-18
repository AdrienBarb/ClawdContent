import { prisma } from "@/lib/db/prisma";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { isSupportedPlatform } from "@/lib/insights/platformConfig";
import { getBestPractices, BRAND_BEST_PRACTICES } from "@/lib/insights/bestPractices";
import {
  buildStrategyInputs,
  buildStrategyPrompt,
  assembleStrategy,
} from "@/lib/insights/strategyContext";
import { parseInsights } from "@/lib/services/insightsHelpers";
import {
  strategyLLMSchema,
  strategyStoredSchema,
  businessStrategyStoredSchema,
  parseStrategy,
  parseBusinessStrategy,
  dataQualityRank,
  kbSourceRank,
  type SocialStrategy,
  type BusinessStrategy,
} from "@/lib/schemas/strategy";
import { isDevelopment } from "@/utils/environments";
import { Prisma } from "@prisma/client";

const STRATEGY_MODEL = "claude-sonnet-4-6";

/**
 * Generate (or refresh) the LLM-authored growth strategy for one account and
 * persist it to `SocialAccount.strategy`. Reads the already-saved `insights` —
 * call this AFTER `computeInsights`. Best-effort: returns null (and never
 * throws) on a missing/unsupported account so it can't break the analysis
 * pipeline; the caller treats null as "no strategy this run".
 */
export async function computeStrategy(
  socialAccountId: string
): Promise<SocialStrategy | null> {
  console.log(`[socialStrategy] ▶︎ start socialAccountId=${socialAccountId}`);

  const account = await prisma.socialAccount.findUnique({
    where: { id: socialAccountId },
    include: { lateProfile: { include: { user: true } } },
  });

  if (!account) {
    console.warn(
      `[socialStrategy] ⚠️  socialAccount ${socialAccountId} no longer exists — skipping`
    );
    return null;
  }

  if (!isSupportedPlatform(account.platform)) {
    console.warn(
      `[socialStrategy] ⏭️  unsupported platform "${account.platform}" — skipping`
    );
    return null;
  }

  const kb = getBestPractices(account.platform);
  if (!kb) {
    console.warn(
      `[socialStrategy] ⏭️  no best-practices KB for "${account.platform}" — skipping`
    );
    return null;
  }

  const insights = parseInsights(account.insights);
  if (!insights) {
    // No usable insights → the strategy falls back to cold-start/benchmark and
    // will read as "0 posts / no history". Distinguishes a Zernio-returned-0
    // problem (insights present, postsAnalyzed=0) from an insights-never-saved
    // problem (computeInsights didn't run/failed before this).
    console.warn(
      `[socialStrategy] ⚠️  no parsable insights on account ${socialAccountId} (platform=${account.platform}) — strategy will be cold-start/benchmark only`
    );
  }
  const knowledgeBase =
    (account.lateProfile.user?.knowledgeBase as Record<string, unknown> | null) ?? null;
  const goal = account.lateProfile.user?.onboardingGoal ?? null;
  // Brand-level strategy (if built during onboarding) — anchors this account's
  // plan to the umbrella positioning/pillars so they stay consistent.
  const businessStrategy = parseBusinessStrategy(
    account.lateProfile.user?.businessStrategy
  );

  const inputs = buildStrategyInputs({
    platform: account.platform,
    insights,
    goal,
    kb,
  });
  const prompt = buildStrategyPrompt(inputs, knowledgeBase, businessStrategy);

  console.log(
    `[strategy:claude:prompt] (${account.platform}, ${prompt.length} chars, goal=${goal ?? "none"}, ` +
      `dataQuality=${inputs.dataQuality}, postsAnalyzed=${inputs.postsAnalyzed}, ` +
      `currentPerWeek=${inputs.cadence.actualPostsPerWeek ?? "null"} (source=${inputs.cadence.source}), ` +
      `followers=${inputs.followersCount ?? "null"})`
  );
  if (isDevelopment) {
    console.log(`[strategy:claude:prompt:full] →\n${prompt}`);
  }

  const { object } = await generateObject({
    model: anthropic(STRATEGY_MODEL),
    schema: strategyLLMSchema,
    prompt,
  });

  const strategy = assembleStrategy(
    object,
    inputs,
    new Date().toISOString(),
    STRATEGY_MODEL
  );

  // Validate the assembled shape before persisting (caps already trimmed).
  strategyStoredSchema.parse(strategy);

  if (isDevelopment) {
    console.log(`[strategy:claude:output] →`, JSON.stringify(strategy, null, 2));
  } else {
    console.log(
      `[strategy:claude:output] → pillars=${strategy.contentPillars.length}, ideas=${strategy.postIdeas.length}, target=${strategy.cadence.targetPerWeek}/wk (current=${strategy.cadence.currentPerWeek ?? "n/a"}, source=${strategy.cadence.source})`
    );
  }

  // Race-safe monotonic guard. Two pipelines write this account's strategy: the
  // onboarding Phase-1 pass (knowledgeBase + goal, often cold/thin) and the
  // analyze-account pass that runs once Zernio's backfill lands (rich). They can
  // overlap, so the read + write run in ONE serializable transaction — on a true
  // write-write conflict Postgres aborts one and Inngest retries the step, which
  // then sees the committed strategy and re-evaluates. This guarantees a lower
  // data tier can never clobber a higher one regardless of timing. Equal tiers
  // overwrite (a fresh same-tier pass with current facts supersedes a premature
  // one).
  const persisted = await prisma.$transaction(
    async (tx) => {
      const current = await tx.socialAccount.findUnique({
        where: { id: socialAccountId },
        select: { strategy: true },
      });
      const existing = parseStrategy(current?.strategy);
      if (
        existing &&
        dataQualityRank(strategy.dataQuality) <
          dataQualityRank(existing.dataQuality)
      ) {
        return { strategy: existing, wrote: false as const };
      }
      await tx.socialAccount.update({
        where: { id: socialAccountId },
        data: { strategy: strategy as unknown as Prisma.InputJsonValue },
      });
      return { strategy, wrote: true as const };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );

  if (persisted.wrote) {
    console.log(
      `[socialStrategy] ✓ saved strategy — platform=${account.platform}, goal=${goal ?? "none"}, dataQuality=${strategy.dataQuality}`
    );
  } else {
    console.log(
      `[socialStrategy] ⏭️  kept existing "${persisted.strategy.dataQuality}" strategy — not downgrading to "${strategy.dataQuality}" (platform=${account.platform})`
    );
  }

  return persisted.strategy;
}

/**
 * Generate (or refresh) the brand-level BUSINESS strategy and persist it to
 * `User.businessStrategy`. Built from the knowledgeBase (confirmed, or the
 * website-analysis draft before step 4) + onboardingGoal alone — NO social data,
 * NO platform — so it's ready almost immediately and powers the paywall reveal
 * without any Zernio analysis wait. Returns null (never throws on a legitimate
 * skip) when the user is gone or has nothing to build from.
 */
export async function computeBusinessStrategy(
  userId: string
): Promise<BusinessStrategy | null> {
  console.log(`[businessStrategy] ▶︎ start userId=${userId}`);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      knowledgeBase: true,
      websiteAnalysis: true,
      onboardingGoal: true,
    },
  });

  if (!user) {
    console.warn(
      `[businessStrategy] ⚠️  user ${userId} no longer exists — skipping`
    );
    return null;
  }

  // Effective knowledgeBase: the confirmed one (step 4) wins; before it's
  // confirmed (step 3) we build from the website-analysis draft so the strategy
  // is ready as early as possible. `kbSource` tags which one we used — it gates
  // the draft→confirmed race in the persist guard below.
  const confirmed = (user.knowledgeBase as Record<string, unknown> | null) ?? null;
  const draft =
    (user.websiteAnalysis as { draft?: Record<string, unknown> } | null)?.draft ??
    null;
  const knowledgeBase = confirmed ?? draft;
  const kbSource: "draft" | "confirmed" = confirmed ? "confirmed" : "draft";

  if (!knowledgeBase) {
    console.warn(
      `[businessStrategy] ⏭️  no knowledgeBase or draft for user ${userId} — skipping (nothing to build a brand strategy from)`
    );
    return null;
  }

  const goal = user.onboardingGoal ?? null;

  // Brand mode: no platform, no insights. The deterministic plumbing degrades to
  // benchmark cadence/times and a cold-start data tier; the synthetic IG+FB
  // socle keeps the rendered prompt platform-neutral.
  const inputs = buildStrategyInputs({
    platform: "brand",
    insights: null,
    goal,
    kb: BRAND_BEST_PRACTICES,
  });
  const prompt = buildStrategyPrompt(inputs, knowledgeBase);

  console.log(
    `[businessStrategy:claude:prompt] (${prompt.length} chars, goal=${goal ?? "none"}, kbSource=${kbSource})`
  );
  if (isDevelopment) {
    console.log(`[businessStrategy:claude:prompt:full] →\n${prompt}`);
  }

  const { object } = await generateObject({
    model: anthropic(STRATEGY_MODEL),
    schema: strategyLLMSchema,
    prompt,
  });

  const assembled = assembleStrategy(
    object,
    inputs,
    new Date().toISOString(),
    STRATEGY_MODEL
  );
  const strategy: BusinessStrategy = { ...assembled, kbSource };

  // Validate the assembled shape before persisting (caps already trimmed).
  businessStrategyStoredSchema.parse(strategy);

  if (isDevelopment) {
    console.log(
      `[businessStrategy:claude:output] →`,
      JSON.stringify(strategy, null, 2)
    );
  } else {
    console.log(
      `[businessStrategy:claude:output] → pillars=${strategy.contentPillars.length}, ideas=${strategy.postIdeas.length}, target=${strategy.cadence.targetPerWeek}/wk, kbSource=${kbSource}`
    );
  }

  // Race-safe monotonic guard on kbSource. Two onboarding fires write this row:
  // step 3 (draft) and step 4 (confirmed). They can finish out of order, so the
  // read + write run in ONE serializable transaction — a confirmed strategy can
  // never be clobbered by a later-arriving draft build. Equal tiers overwrite (a
  // step-4 re-edit with corrected facts supersedes a premature build).
  const persisted = await prisma.$transaction(
    async (tx) => {
      const current = await tx.user.findUnique({
        where: { id: userId },
        select: { businessStrategy: true },
      });
      const existing = parseBusinessStrategy(current?.businessStrategy);
      if (
        existing &&
        kbSourceRank(strategy.kbSource) < kbSourceRank(existing.kbSource)
      ) {
        return { strategy: existing, wrote: false as const };
      }
      await tx.user.update({
        where: { id: userId },
        data: {
          businessStrategy: strategy as unknown as Prisma.InputJsonValue,
        },
      });
      return { strategy, wrote: true as const };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );

  if (persisted.wrote) {
    console.log(
      `[businessStrategy] ✓ saved — goal=${goal ?? "none"}, kbSource=${kbSource}`
    );
  } else {
    console.log(
      `[businessStrategy] ⏭️  kept existing "${persisted.strategy.kbSource}" strategy — not downgrading to "${kbSource}"`
    );
  }

  return persisted.strategy;
}

/**
 * Client-safe strategy: the stored shape WITHOUT the internal `model` field.
 * `model` holds the real engine name (e.g. "claude-sonnet-4-6") for internal
 * debugging and must never reach the client — exposing it would violate the
 * no-AI-branding rule (CLAUDE.md). The type-level Omit makes that a compile error.
 */
export type ClientStrategy = Omit<SocialStrategy, "model">;

function toClientStrategy(strategy: SocialStrategy): ClientStrategy {
  // Drop `model` at the read boundary (kept in the stored JSON for internal use).
  const clientStrategy = { ...strategy };
  delete (clientStrategy as { model?: string }).model;
  return clientStrategy;
}

export interface AccountStrategy {
  accountId: string;
  platform: string;
  username: string;
  analysisStatus: string;
  strategy: ClientStrategy | null;
}

/**
 * Read the persisted strategy for each of a user's active, supported accounts.
 * Read-only — never triggers generation. `strategy` is null until the analysis
 * pipeline has produced one (or if it fails to parse). The provider-identifying
 * `model` field is stripped before returning (never user-facing).
 */
export async function getAccountStrategies(
  userId: string
): Promise<AccountStrategy[]> {
  const accounts = await prisma.socialAccount.findMany({
    where: { lateProfile: { userId }, status: "active" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      platform: true,
      username: true,
      analysisStatus: true,
      strategy: true,
    },
  });

  return accounts
    .filter((a) => isSupportedPlatform(a.platform))
    .map((a) => {
      const parsed = parseStrategy(a.strategy);
      return {
        accountId: a.id,
        platform: a.platform,
        username: a.username,
        analysisStatus: a.analysisStatus,
        strategy: parsed ? toClientStrategy(parsed) : null,
      };
    });
}
