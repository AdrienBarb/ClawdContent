import { prisma } from "@/lib/db/prisma";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { inngest } from "@/inngest/client";
import { getPlatformConfig } from "@/lib/insights/platformConfig";
import {
  insightsV2Schema,
  type Insights,
} from "@/lib/schemas/insights";
import type { PostSuggestion } from "@prisma/client";

interface GenerateOptions {
  topic?: string;
}

const STALE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;
const SUGGESTION_COUNT = 5;

// NOTE: Anthropic structured output rejects BOTH minItems and maxItems on arrays.
// No length constraints in the schema. We ask Claude for exactly 5 in the prompt
// and trim/warn in code if the count is off.
const generatedPostsSchema = z.object({
  suggestions: z.array(
    z.object({
      content: z.string(),
      contentType: z.enum(["text", "image", "carousel"]),
      reasoning: z.string(),
    })
  ),
});

export type SuggestionWithAccount = PostSuggestion & {
  socialAccount: { platform: string; username: string };
};

export async function generateSuggestions(
  socialAccountId: string,
  options: GenerateOptions = {}
): Promise<SuggestionWithAccount[]> {
  const { topic } = options;
  console.log(
    `[postSuggestions] ▶︎ start socialAccountId=${socialAccountId} topic=${topic ?? "none"}`
  );

  const account = await prisma.socialAccount.findUnique({
    where: { id: socialAccountId },
    include: { lateProfile: { include: { user: true } } },
  });

  if (!account) {
    console.warn(
      `[postSuggestions] ⚠️  socialAccount ${socialAccountId} no longer exists — skipping (likely deleted between event firing and processing)`
    );
    return [];
  }

  const config = getPlatformConfig(account.platform);
  const knowledgeBase =
    (account.lateProfile.user.knowledgeBase as Record<string, unknown> | null) ?? null;

  // Read cached insights — may be missing or stale
  const insights = parseInsights(account.insights);
  const isStale =
    insights !== null &&
    Date.now() - new Date(insights.meta.analyzedAt).getTime() > STALE_THRESHOLD_MS;

  if (insights === null) {
    console.log(`[postSuggestions] ⚠️  insights missing — triggering background refresh`);
    await triggerBackgroundRefresh(socialAccountId);
  } else if (isStale) {
    console.log(
      `[postSuggestions] ⏰ insights stale (analysedAt=${insights.meta.analyzedAt}) — triggering background refresh, using stale data now`
    );
    await triggerBackgroundRefresh(socialAccountId);
  } else {
    console.log(
      `[postSuggestions] ✓ using cached insights — dataQuality=${insights.meta.dataQuality}, postsAnalyzed=${insights.meta.postsAnalyzed}`
    );
  }

  console.log(
    `[suggestions:cache] insights read for ${account.platform} →`,
    insights ? JSON.stringify(insights, null, 2) : "null"
  );

  const prompt = buildPrompt({
    platformDisplayName: config.displayName,
    charLimit: config.charLimit,
    insights,
    knowledgeBase,
    topic,
  });

  console.log(
    `[postSuggestions] 🧠 prompt length=${prompt.length} chars, has insights=${insights !== null}`
  );
  console.log(
    `[suggestions:claude:prompt] (${prompt.length} chars) →\n${prompt}`
  );

  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-6"),
    schema: generatedPostsSchema,
    prompt,
  });

  console.log(`[postSuggestions] 🤖 Claude returned ${object.suggestions.length} suggestions`);
  console.log(
    `[suggestions:claude:output] →`,
    JSON.stringify(object, null, 2)
  );

  if (object.suggestions.length !== SUGGESTION_COUNT) {
    console.warn(
      `[postSuggestions] ⚠️  Claude returned ${object.suggestions.length} suggestions, expected ${SUGGESTION_COUNT} — proceeding with what we got`
    );
  }

  // Trim to max SUGGESTION_COUNT in case Claude returns more
  const finalSuggestions = object.suggestions.slice(0, SUGGESTION_COUNT);

  // Pick suggestedDay/Hour: prefer real bestTimes, rotate through top 3, fall back to platform defaults
  const slots = pickTimeSlots(insights, config.defaultBestTimes, finalSuggestions.length);

  // Atomic: delete old + create new in one transaction. If anything fails, the old suggestions survive.
  const created = await prisma.$transaction(async (tx) => {
    await tx.postSuggestion.deleteMany({ where: { socialAccountId } });
    return Promise.all(
      finalSuggestions.map((s, i) =>
        tx.postSuggestion.create({
          data: {
            socialAccountId,
            content: s.content,
            contentType: s.contentType,
            suggestedDay: slots[i].dayOfWeek,
            suggestedHour: slots[i].hour,
            reasoning: s.reasoning,
          },
          include: { socialAccount: { select: { platform: true, username: true } } },
        })
      )
    );
  });

  console.log(`[postSuggestions] ✓ saved ${created.length} suggestions`);

  return created;
}

function parseInsights(raw: unknown): Insights | null {
  if (raw === null || raw === undefined) return null;
  const parsed = insightsV2Schema.safeParse(raw);
  if (!parsed.success) {
    console.warn(`[postSuggestions] ⚠️  insights JSON failed v2 parse — treating as missing`);
    return null;
  }
  return parsed.data;
}

async function triggerBackgroundRefresh(socialAccountId: string): Promise<void> {
  try {
    await inngest.send({
      name: "account/refresh-insights",
      data: { socialAccountId },
    });
  } catch (err) {
    console.warn(
      `[postSuggestions] ⚠️  failed to trigger refresh:`,
      err instanceof Error ? err.message : err
    );
  }
}

interface PromptInput {
  platformDisplayName: string;
  charLimit: number | null;
  insights: Insights | null;
  knowledgeBase: Record<string, unknown> | null;
  topic?: string;
}

function buildPrompt(input: PromptInput): string {
  const sections: string[] = [];

  sections.push(
    `You are writing 5 post ideas for a small business owner's ${input.platformDisplayName} account. Match their voice, sound natural and human, and respect ${input.platformDisplayName}'s conventions.`
  );

  sections.push(formatBusinessContext(input.knowledgeBase));

  if (input.insights) {
    const { zernio, computed, inferred, meta } = input.insights;
    const hasPosts = meta.postsAnalyzed > 0;

    sections.push(`## Their account
Followers: ${zernio.account.followersCount ?? "unknown"}${
      zernio.account.growth30dPercentage !== null
        ? ` (${zernio.account.growth30dPercentage > 0 ? "+" : ""}${zernio.account.growth30dPercentage}% in 30 days)`
        : ""
    }
Display name: ${zernio.account.displayName ?? "unknown"}
History: ${describeDataQuality(meta.dataQuality, meta.postsAnalyzed)}${meta.voiceBorrowedFromPlatform ? ` (voice borrowed from their ${meta.voiceBorrowedFromPlatform} account)` : ""}`);

    if (zernio.topPosts.length > 0) {
      const postsBlock = zernio.topPosts
        .map((p, i) => {
          const m = p.metrics;
          return `Post ${i + 1} (${p.mediaType ?? "text"}, likes:${m.likes} views:${m.views} saves:${m.saves} engagement:${m.engagementRate}%):
${p.content}`;
        })
        .join("\n\n");
      sections.push(`## Their top performing posts (real metrics, primary metric: ${computed.primaryMetric}, avg: ${computed.avgPrimaryMetric})
${postsBlock}`);
    }

    if (computed.extractedHashtags.length > 0) {
      sections.push(
        `## Hashtags they actually use (extracted from their posts)
${computed.extractedHashtags.map((h) => `${h.tag} (×${h.uses})`).join(", ")}`
      );
    }

    if (hasPosts) {
      sections.push(`## Their voice patterns (computed from their posts)
- Average post length: ${computed.voiceStats.avgPostLengthChars} characters
- Average sentence length: ${computed.voiceStats.avgSentenceLength} characters
- Posts with emoji: ${Math.round(computed.voiceStats.emojiDensity * 100)}%
- Hashtags per post: ${computed.voiceStats.hashtagsPerPost}
- Posts with a question: ${Math.round(computed.voiceStats.questionFrequency * 100)}%
- Posts with a link: ${Math.round(computed.voiceStats.linkFrequency * 100)}%`);
    }

    if (computed.contentMix.length > 0) {
      sections.push(
        `## Their content mix\n${computed.contentMix.map((c) => `${c.type}: ${c.percentage}%`).join(", ")}`
      );
    }

    if (zernio.bestTimes && zernio.bestTimes.length > 0) {
      sections.push(
        `## Best times to post (from their own data)\n${zernio.bestTimes
          .slice(0, 3)
          .map((t) => `${dayName(t.dayOfWeek)} ${t.hour}h UTC (avg engagement ${Math.round(t.avgEngagement)})`)
          .join(", ")}`
      );
    } else {
      sections.push(
        `## Best times to post\n(No historical data — platform conventions will be used.)`
      );
    }

    if (zernio.postingFrequency) {
      sections.push(
        `## Their posting cadence\nThey post ~${zernio.postingFrequency.avgPostsPerWeek}/week. Sweet spot for them: ${zernio.postingFrequency.bestPostsPerWeek}/week.`
      );
    }

    if (inferred) {
      sections.push(`## Inferred from their content (Claude analysis, ${inferred.confidence} confidence)
- Topics they cover: ${inferred.topics.join(", ")}
- Tone: ${inferred.toneSummary}
- Patterns that perform: ${inferred.performingPatterns.join("; ")}`);
    }
  } else {
    sections.push(
      `## No historical data
This account has no analysed posts yet. Lean on the business context and ${input.platformDisplayName} best practices.`
    );
  }

  if (input.topic) {
    sections.push(
      `## Topic constraint\nAll 5 suggestions must relate to: "${input.topic}". Stay true to the business voice.`
    );
  }

  sections.push(`## What to produce
Return EXACTLY 5 post suggestions (no more, no fewer). For each:
- content: the post text${input.charLimit ? ` (max ${input.charLimit} characters)` : ""}. Use hashtags they actually use when natural. Match their tone, length, and emoji habits.
- contentType: "text", "image", or "carousel" — bias towards what works for them based on their content mix.
- reasoning: ONE short sentence explaining why this would land with their audience.`);

  return sections.join("\n\n");
}

function pickTimeSlots(
  insights: Insights | null,
  fallback: { dayOfWeek: number; hour: number }[],
  count: number
): { dayOfWeek: number; hour: number }[] {
  const real = insights?.zernio.bestTimes;
  const source =
    real && real.length > 0
      ? real.map((t) => ({ dayOfWeek: t.dayOfWeek, hour: t.hour }))
      : fallback;
  const result: { dayOfWeek: number; hour: number }[] = [];
  for (let i = 0; i < count; i += 1) {
    result.push(source[i % source.length]);
  }
  return result;
}

function formatBusinessContext(kb: Record<string, unknown> | null): string {
  if (!kb) return "## Business\nNo business info available.";
  const services = Array.isArray(kb.services)
    ? (kb.services as string[]).join(", ")
    : "Not specified";
  return `## Business
Name: ${kb.businessName ?? "Unknown"}
Description: ${kb.description ?? "No description"}
Services: ${services}`;
}

function dayName(d: number): string {
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][d] ?? `Day${d}`;
}

function describeDataQuality(
  quality: Insights["meta"]["dataQuality"],
  postsAnalyzed: number
): string {
  switch (quality) {
    case "rich":
      return `${postsAnalyzed} of their past posts analysed.`;
    case "thin":
      return `Only ${postsAnalyzed} past post${postsAnalyzed === 1 ? "" : "s"} available — limited signal.`;
    case "cold_start":
      return "No posts on this account yet — start fresh.";
    case "platform_no_history":
      return "This platform doesn't share their post history with us.";
  }
}
