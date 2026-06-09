import { prisma } from "@/lib/db/prisma";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { isSupportedPlatform } from "@/lib/insights/platformConfig";
import { getBestPractices } from "@/lib/insights/bestPractices";
import {
  buildStrategyInputs,
  buildStrategyPrompt,
  assembleStrategy,
} from "@/lib/insights/strategyContext";
import { parseInsights } from "@/lib/services/insightsHelpers";
import {
  strategyLLMSchema,
  strategyStoredSchema,
  parseStrategy,
  type SocialStrategy,
} from "@/lib/schemas/strategy";
import { isDevelopment } from "@/utils/environments";
import type { Prisma } from "@prisma/client";

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
  const knowledgeBase =
    (account.lateProfile.user?.knowledgeBase as Record<string, unknown> | null) ?? null;
  const goal = account.lateProfile.user?.onboardingGoal ?? null;

  const inputs = buildStrategyInputs({
    platform: account.platform,
    insights,
    goal,
    kb,
  });
  const prompt = buildStrategyPrompt(inputs, knowledgeBase);

  console.log(
    `[strategy:claude:prompt] (${account.platform}, ${prompt.length} chars, goal=${goal ?? "none"}, dataQuality=${inputs.dataQuality})`
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

  await prisma.socialAccount.update({
    where: { id: socialAccountId },
    data: { strategy: strategy as unknown as Prisma.InputJsonValue },
  });

  console.log(
    `[socialStrategy] ✓ saved strategy — platform=${account.platform}, goal=${goal ?? "none"}`
  );

  return strategy;
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
