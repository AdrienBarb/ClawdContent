import { prisma } from "@/lib/db/prisma";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { gatherAccountContext } from "@/lib/services/zernioContext";
import {
  computeAvgPrimaryMetric,
  computeContentMix,
  computeVoiceStats,
  extractHashtags,
  pickPrimaryMetric,
  rankByPrimaryMetric,
} from "@/lib/insights/extract";
import { getPlatformConfig } from "@/lib/insights/platformConfig";
import {
  inferredZoneClaudeSchema,
  insightsV2Schema,
  INSIGHTS_VERSION,
  type ComputedZone,
  type InferredZone,
  type Insights,
  type InsightsMeta,
  type ZernioZone,
} from "@/lib/schemas/insights";
import { isDevelopment } from "@/utils/environments";
import { formatBusinessContext } from "@/lib/services/promptContext";
import type { AnalyticsPost } from "@/lib/late/mutations";
import type { Prisma } from "@prisma/client";

interface ComputeOptions {
  source?: "external" | "all";
}

const REFRESH_INTERVAL_DAYS = 7;
const POST_EXCERPT_CAP = 200;

export async function computeInsights(
  socialAccountId: string,
  options: ComputeOptions = {}
): Promise<Insights | null> {
  const { source = "external" } = options;

  console.log(
    `[accountInsights] ▶︎ start socialAccountId=${socialAccountId} source=${source}`
  );

  const account = await prisma.socialAccount.findUnique({
    where: { id: socialAccountId },
    include: { lateProfile: { include: { user: true } } },
  });

  if (!account) {
    console.warn(
      `[accountInsights] ⚠️  socialAccount ${socialAccountId} no longer exists — skipping (likely deleted between event firing and processing)`
    );
    return null;
  }

  const apiKey = account.lateProfile.lateApiKey;
  const lateAccountId = account.lateAccountId;
  const knowledgeBase =
    (account.lateProfile.user.knowledgeBase as Record<string, unknown> | null) ?? null;

  const ctx = await gatherAccountContext({
    platform: account.platform,
    lateAccountId,
    apiKey,
    source,
  });

  const config = getPlatformConfig(account.platform);
  const primaryMetric = pickPrimaryMetric(account.platform);
  const topPosts = rankByPrimaryMetric(ctx.posts, primaryMetric, 5);

  const zernio: ZernioZone = {
    account: ctx.accountMeta,
    topPosts: topPosts.map(toTopPost),
    bestTimes: ctx.bestTimes
      ? ctx.bestTimes.map((s) => ({
          dayOfWeek: s.day_of_week,
          hour: s.hour,
          avgEngagement: s.avg_engagement,
          postCount: s.post_count,
        }))
      : null,
    postingFrequency: ctx.postingFrequency,
  };

  const computed: ComputedZone = {
    primaryMetric,
    avgPrimaryMetric: computeAvgPrimaryMetric(ctx.posts, primaryMetric),
    contentMix: computeContentMix(ctx.posts),
    extractedHashtags: extractHashtags(ctx.posts, 15),
    voiceStats: computeVoiceStats(ctx.posts),
  };

  // Inferred zone — try Claude inference if rich enough, else borrow from another platform
  let inferred: InferredZone | null = null;
  let voiceBorrowedFromPlatform: string | null = null;

  if (ctx.dataQuality === "rich" || ctx.dataQuality === "thin") {
    inferred = await inferZoneFromPosts({
      platformDisplayName: config.displayName,
      posts: topPosts,
      knowledgeBase,
      postCount: ctx.posts.length,
    });
  } else {
    // cold-start or platform_no_history → try cross-platform voice borrowing
    const borrow = await borrowInferredFromOtherPlatform(
      account.lateProfileId,
      socialAccountId
    );
    if (borrow) {
      // Borrowed signal is weaker than native — never claim higher than "low".
      inferred = { ...borrow.inferred, confidence: "low" };
      voiceBorrowedFromPlatform = borrow.fromPlatform;
      console.log(
        `[accountInsights] 🔄 borrowed voice from platform=${borrow.fromPlatform} (confidence forced to low)`
      );
    }
  }

  const meta: InsightsMeta = {
    version: INSIGHTS_VERSION,
    dataQuality: ctx.dataQuality,
    analyzedAt: new Date().toISOString(),
    postsAnalyzed: ctx.posts.length,
    syncTriggered: ctx.syncTriggered,
    nextRefreshAt: new Date(
      Date.now() + REFRESH_INTERVAL_DAYS * 24 * 60 * 60 * 1000
    ).toISOString(),
    voiceBorrowedFromPlatform,
  };

  const insights: Insights = { meta, zernio, computed, inferred };

  // Validate before storing
  insightsV2Schema.parse(insights);

  if (isDevelopment) {
    console.log(
      `[insights:final] full insights object for ${account.platform} →`,
      JSON.stringify(insights, null, 2)
    );
  } else {
    console.log(
      `[insights:final] insights saved for ${account.platform} → dataQuality=${meta.dataQuality}, postsAnalyzed=${meta.postsAnalyzed}, hasInferred=${inferred !== null}`
    );
  }

  // analysisStatus is intentionally not touched here — it's flipped to
  // "completed" by the analyze-account / refresh-insights Inngest functions
  // right after insights are saved. Suggestions are generated separately, only
  // when the user explicitly asks (Get ideas / from-brief).
  await prisma.socialAccount.update({
    where: { id: socialAccountId },
    data: {
      insights: insights as unknown as Prisma.InputJsonValue,
      lastAnalyzedAt: new Date(),
    },
  });

  console.log(
    `[accountInsights] ✓ saved insights — platform=${account.platform}, dataQuality=${meta.dataQuality}, postsAnalyzed=${meta.postsAnalyzed}, inferred=${inferred ? "yes" : "no"}, syncTriggered=${meta.syncTriggered}`
  );

  return insights;
}

function toTopPost(post: AnalyticsPost): ZernioZone["topPosts"][number] {
  return {
    content: truncate(post.content, POST_EXCERPT_CAP),
    mediaType: post.mediaType ?? null,
    publishedAt: post.publishedAt,
    metrics: {
      impressions: post.analytics.impressions,
      reach: post.analytics.reach,
      likes: post.analytics.likes,
      comments: post.analytics.comments,
      shares: post.analytics.shares,
      saves: post.analytics.saves,
      views: post.analytics.views,
      engagementRate: post.analytics.engagementRate,
    },
  };
}

interface InferOptions {
  platformDisplayName: string;
  posts: AnalyticsPost[];
  knowledgeBase: Record<string, unknown> | null;
  postCount: number;
}

async function inferZoneFromPosts(opts: InferOptions): Promise<InferredZone> {
  const businessContext = formatBusinessContext(opts.knowledgeBase, { withHeader: false });
  const postsBlock = opts.posts
    .map((p, i) => {
      const e = p.analytics;
      return `Post ${i + 1} (likes:${e.likes} comments:${e.comments} views:${e.views} saves:${e.saves} engagement:${e.engagementRate}%):
${truncate(p.content, POST_EXCERPT_CAP)}`;
    })
    .join("\n\n");

  const prompt = `You are analysing a small business owner's ${opts.platformDisplayName} account to identify their content patterns.

${businessContext}

Their top performing posts:

${postsBlock}

From these ${opts.postCount} post(s), produce a JSON object with:
- topics: 3-8 recurring themes you see in their content
- toneSummary: ONE sentence describing how they write (formality, warmth, voice quirks)
- performingPatterns: 1-3 concrete patterns shared by the best performers (e.g. "questions in opening line", "behind-the-scenes photos with first-name CTAs")
- confidence: "high" if 5+ posts and clear patterns, "medium" if 2-4 posts, "low" if 1 post or patterns unclear

Be specific. Avoid generic marketing-speak.`;

  console.log(`[accountInsights] 🧠 inferring zone from ${opts.posts.length} posts`);
  if (isDevelopment) {
    console.log(`[insights:claude:prompt] (${prompt.length} chars) →\n${prompt}`);
  } else {
    console.log(`[insights:claude:prompt] (${prompt.length} chars)`);
  }

  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-6"),
    schema: inferredZoneClaudeSchema,
    prompt,
  });

  if (isDevelopment) {
    console.log(
      `[insights:claude:output] inferred zone →`,
      JSON.stringify(object, null, 2)
    );
  } else {
    console.log(
      `[insights:claude:output] inferred zone → topics=${object.topics?.length ?? 0}, patterns=${object.performingPatterns?.length ?? 0}, confidence=${object.confidence ?? "n/a"}`
    );
  }

  // Trim to internal caps (Anthropic schema can't enforce maxItems, we do it here)
  return {
    ...object,
    topics: object.topics.slice(0, 8),
    performingPatterns: object.performingPatterns.slice(0, 3),
  };
}

async function borrowInferredFromOtherPlatform(
  lateProfileId: string,
  excludeAccountId: string
): Promise<{ inferred: InferredZone; fromPlatform: string } | null> {
  const others = await prisma.socialAccount.findMany({
    where: {
      lateProfileId,
      id: { not: excludeAccountId },
      status: "active",
    },
    orderBy: { lastAnalyzedAt: "desc" },
  });

  for (const other of others) {
    if (other.insights === null || other.insights === undefined) continue;
    const parsed = insightsV2Schema.safeParse(other.insights);
    if (!parsed.success) continue;
    if (parsed.data.meta.dataQuality !== "rich") continue;
    if (!parsed.data.inferred) continue;
    return { inferred: parsed.data.inferred, fromPlatform: other.platform };
  }

  return null;
}

function truncate(s: string | null | undefined, max: number): string {
  if (!s) return "";
  return s.length <= max ? s : s.slice(0, max - 1) + "…";
}
