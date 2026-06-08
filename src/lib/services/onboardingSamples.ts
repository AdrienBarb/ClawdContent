import { prisma } from "@/lib/db/prisma";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  defaultContentType,
  getPlatformConfig,
} from "@/lib/insights/platformConfig";
import { briefOutputClaudeSchema } from "@/lib/schemas/createFromBrief";
import { parseInsights, pickTimeSlots } from "@/lib/services/insightsHelpers";
import {
  formatBusinessContext,
  formatVoiceFingerprint,
} from "@/lib/services/promptContext";
import { buildHumanRulesBlock, HUMAN_SAMPLING } from "@/lib/ai/humanRules";
import { humanizeContent } from "@/lib/ai/humanize";
import type { PostSuggestion } from "@prisma/client";

export type SampleSuggestion = PostSuggestion & {
  socialAccount: { platform: string; username: string };
};

const MAX_SAMPLES = 3;

/**
 * Generate 2–3 introductory sample posts for the onboarding "aha" screen.
 *
 * Deliberately SEPARATE from `createFromBrief` (which is the chat tool's
 * action): the onboarding preview has a fixed intro brief, a hard cap of 3,
 * and no media. It reuses the same low-level helpers (business context, voice
 * fingerprint, humanizer, platform config) so drafts read identically to the
 * ones the chat produces. Cold-start safe — leans on business context when the
 * account has no analysed history yet.
 */
export async function generateOnboardingSamples({
  userId,
}: {
  userId: string;
}): Promise<SampleSuggestion[]> {
  const account = await prisma.socialAccount.findFirst({
    where: { lateProfile: { userId }, status: "active" },
    orderBy: { createdAt: "asc" },
    include: { lateProfile: { include: { user: true } } },
  });

  if (!account || !account.lateProfile.user) {
    console.warn(
      `[onboardingSamples] no active account for user ${userId} — skipping`
    );
    return [];
  }

  // Idempotent: the screen calls this on mount and the user can re-enter it
  // (back-nav, refresh, StrictMode double-mount). If we already drafted for
  // this account, return the existing drafts instead of appending duplicates
  // that would surface on the real board after they subscribe.
  const existing = await prisma.postSuggestion.findMany({
    where: { socialAccountId: account.id },
    orderBy: { createdAt: "desc" },
    take: MAX_SAMPLES,
    include: { socialAccount: { select: { platform: true, username: true } } },
  });
  if (existing.length > 0) {
    return existing as SampleSuggestion[];
  }

  const config = getPlatformConfig(account.platform);
  const knowledgeBase =
    (account.lateProfile.user.knowledgeBase as Record<string, unknown> | null) ??
    null;
  const insights = parseInsights(account.insights);

  const prompt = buildSamplePrompt({
    platformDisplayName: config.displayName,
    charLimit: config.charLimit,
    knowledgeBase,
    voiceBlock: formatVoiceFingerprint(insights, { topPostsCount: 3 }),
  });

  console.log(
    `[onboardingSamples:claude:prompt] (${account.platform}, ${prompt.length} chars)`
  );

  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-6"),
    schema: briefOutputClaudeSchema,
    prompt,
    ...HUMAN_SAMPLING,
  });

  const posts = object.posts.slice(0, MAX_SAMPLES);
  if (posts.length === 0) {
    console.warn(`[onboardingSamples] ⚠️  Claude returned 0 posts`);
    return [];
  }

  const slots = pickTimeSlots(insights, config.defaultBestTimes, posts.length);
  const contentType = defaultContentType(config.requiresMedia);

  const created = await prisma.$transaction(
    async (tx) => {
      const rows: SampleSuggestion[] = [];
      for (let i = 0; i < posts.length; i += 1) {
        const p = posts[i];
        const row = await tx.postSuggestion.create({
          data: {
            socialAccountId: account.id,
            content: humanizeContent(p.content),
            contentType,
            suggestedDay: slots[i].dayOfWeek,
            suggestedHour: slots[i].hour,
            reasoning: p.reasoning,
          },
          include: {
            socialAccount: { select: { platform: true, username: true } },
          },
        });
        rows.push(row as SampleSuggestion);
      }
      return rows;
    },
    { timeout: 30_000 }
  );

  console.log(
    `[onboardingSamples] ✓ saved ${created.length} sample posts for ${account.platform}`
  );

  return created;
}

function buildSamplePrompt(input: {
  platformDisplayName: string;
  charLimit: number | null;
  knowledgeBase: Record<string, unknown> | null;
  voiceBlock: string | null;
}): string {
  const sections: string[] = [];

  sections.push(
    `You are a social media manager writing the very first posts for a small business owner's ${input.platformDisplayName} account. Match their voice, sound natural and human, and respect ${input.platformDisplayName}'s conventions.`
  );

  sections.push(formatBusinessContext(input.knowledgeBase));

  if (input.voiceBlock) {
    sections.push(input.voiceBlock);
  } else {
    sections.push(
      `## No historical data\nThis account has no analysed posts yet. Lean on the business context and ${input.platformDisplayName} best practices.`
    );
  }

  sections.push(`## Your task
Write exactly 2-3 introductory posts that show this business owner what we'd publish for them. Each post should introduce who they are, what they offer, or invite their audience to engage — the kind of thing a new follower would see first.

Each post must be:
- Tailored to ${input.platformDisplayName}${input.charLimit ? ` (max ${input.charLimit} characters)` : ""}.
- Grounded in the business context above — concrete, never generic filler.
- Distinct from the others (different hooks, angles, openings).
- Written in the same language as the business context.

## Each post object
- content: the post text. No surrounding quotes. No "Post 1:" prefix. Ready to publish.
- reasoning: ONE short sentence on why this would land with their audience.`);

  sections.push(buildHumanRulesBlock());

  return sections.join("\n\n");
}
