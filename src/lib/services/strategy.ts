import { prisma } from "@/lib/db/prisma";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { getPlatformConfig } from "@/lib/insights/platformConfig";
import { getBestSlots } from "@/lib/services/bestTimes";
import { formatBusinessContext } from "@/lib/services/promptContext";
import { formatBrandIdentityForPrompt } from "@/lib/services/brandIdentity";
import {
  strategyClaudeSchema,
  strategySchema,
  type Strategy,
  type StrategyBestTime,
} from "@/lib/schemas/strategy";
import { insightsV2Schema } from "@/lib/schemas/insights";
import type { Prisma } from "@prisma/client";

/**
 * Per-platform posts-per-week defaults sourced from spec D-decisions and
 * 2025-2026 industry benchmarks. `null` means generation is disabled in v1.
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

const isDevelopment = process.env.NODE_ENV !== "production";

function clampCadence(value: number, base: number): number {
  const lo = Math.max(1, base - 1);
  const hi = base + 1;
  const rounded = Math.round(value);
  return Math.min(hi, Math.max(lo, rounded));
}

function clampSlot(slot: { day: number; hour: number; score: number }): StrategyBestTime {
  return {
    day: Math.min(6, Math.max(0, Math.round(slot.day))),
    hour: Math.min(23, Math.max(0, Math.round(slot.hour))),
    score: slot.score,
  };
}

interface AccountWithUser {
  id: string;
  platform: string;
  insights: Prisma.JsonValue;
  lateProfile: {
    user: {
      id: string;
      knowledgeBase: Prisma.JsonValue;
      brandIdentity: Prisma.JsonValue;
    };
  };
}

function topPerformerSummary(outcome: {
  topPerformers: Prisma.JsonValue;
} | null): string {
  if (!outcome) return "No outcome history yet — this is the first strategy for this account.";
  const tops = Array.isArray(outcome.topPerformers)
    ? outcome.topPerformers.slice(0, 3)
    : [];
  if (tops.length === 0) return "No outcome history yet.";
  return tops
    .map((p, i) => {
      const post = p as Record<string, unknown>;
      const content = typeof post.content === "string" ? post.content : "";
      const metric =
        typeof post.metricValue === "number"
          ? `${post.metricValue}`
          : "n/a";
      return `${i + 1}. (${metric}) ${content.slice(0, 160)}`;
    })
    .join("\n");
}

export async function defineStrategyForAccount(
  socialAccountId: string
): Promise<Strategy | null> {
  console.log(`[strategy] ▶︎ start socialAccountId=${socialAccountId}`);

  const account = (await prisma.socialAccount.findUnique({
    where: { id: socialAccountId },
    include: {
      lateProfile: {
        include: {
          user: {
            select: { id: true, knowledgeBase: true, brandIdentity: true },
          },
        },
      },
    },
  })) as (AccountWithUser & { lateProfileId: string }) | null;

  if (!account) {
    console.warn(
      `[strategy] ⚠︎ socialAccount ${socialAccountId} no longer exists — skipping`
    );
    return null;
  }

  const cadenceDefault = DEFAULT_CADENCE[account.platform] ?? null;

  // Video-only platforms get generation disabled in v1.
  if (cadenceDefault === null) {
    await prisma.socialAccount.update({
      where: { id: socialAccountId },
      data: { generationEnabled: false },
    });
    console.log(
      `[strategy] ⏭ ${account.platform} disabled in v1 — generationEnabled=false, no strategy generated`
    );
    return null;
  }

  const platformConfig = getPlatformConfig(account.platform);
  const platformDisplayName = platformConfig?.displayName ?? account.platform;
  const charLimit = platformConfig?.charLimit ?? null;

  // Resolve best times: prefer insights, fall back to platform defaults.
  const parsedInsights = insightsV2Schema.safeParse(account.insights);
  const insightsBestTimes = parsedInsights.success
    ? parsedInsights.data.zernio.bestTimes
    : null;

  const slots = getBestSlots({
    insightsBestTimes,
    platform: account.platform,
  });
  const bestTimes: StrategyBestTime[] = slots
    .slice(0, 7)
    .map((s) => clampSlot({ day: s.day, hour: s.hour, score: s.engagement }));

  // Outcome history for cadence steering.
  const outcome = await prisma.outcomeSnapshot.findUnique({
    where: { userId: account.lateProfile.user.id },
  });

  const businessContext = formatBusinessContext(
    account.lateProfile.user.knowledgeBase as Record<string, unknown> | null,
    { withHeader: false }
  );
  const brandContext = formatBrandIdentityForPrompt(
    account.lateProfile.user.brandIdentity
  );

  const prompt = `You are building a social-media strategy for a small business on ${platformDisplayName}.

Business profile:
${businessContext}

${brandContext ? `Brand identity:\n${brandContext}\n` : ""}
Platform constraints:
- Recommended cadence (industry default): ${cadenceDefault} posts/week
- Character limit: ${charLimit ?? "long-form"}
${platformConfig?.requiresMedia ? `- Media required: ${platformConfig.requiresMedia}` : ""}

Past performance signal:
${topPerformerSummary(outcome)}

Produce a JSON object with:
- postsPerWeek: an integer cadence within ±1 of ${cadenceDefault} (so ${Math.max(1, cadenceDefault - 1)}-${cadenceDefault + 1}). Use the lower end if the business is just starting; the higher end if their past posts performed well.
- contentPillars: 3-5 recurring themes specific to THIS business (not generic marketing categories). Each pillar is 2-5 words.
- voiceRules: 2-4 imperative voice rules that match the business's tone (e.g. "Use first-person plural", "Skip exclamation marks", "Lead with a question"). No generic copywriting tips.
- imageStyle: ONE sentence describing the visual style for generated images — colors, mood, composition. Anchor to the brand identity if provided.

Be specific. Avoid generic marketing-speak.`;

  if (isDevelopment) {
    console.log(`[strategy:claude:prompt] (${prompt.length} chars) →\n${prompt}`);
  } else {
    console.log(`[strategy:claude:prompt] (${prompt.length} chars)`);
  }

  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-6"),
    schema: strategyClaudeSchema,
    prompt,
  });

  if (isDevelopment) {
    console.log(`[strategy:claude:output] →`, JSON.stringify(object, null, 2));
  }

  const candidate: Strategy = {
    postsPerWeek: clampCadence(object.postsPerWeek, cadenceDefault),
    contentPillars: object.contentPillars.slice(0, 5),
    voiceRules: object.voiceRules.slice(0, 4),
    bestTimes,
    imageStyle: object.imageStyle.trim(),
  };

  const validated = strategySchema.safeParse(candidate);
  if (!validated.success) {
    console.warn(
      `[strategy] ⚠︎ Claude output failed validation — issues:`,
      validated.error.issues
    );
    return null;
  }

  await prisma.socialAccount.update({
    where: { id: socialAccountId },
    data: {
      strategy: validated.data as unknown as Prisma.InputJsonValue,
      strategyDefinedAt: new Date(),
    },
  });

  console.log(
    `[strategy] ✓ saved — platform=${account.platform}, postsPerWeek=${validated.data.postsPerWeek}, pillars=${validated.data.contentPillars.length}, bestTimes=${validated.data.bestTimes.length}`
  );

  return validated.data;
}
