import { prisma } from "@/lib/db/prisma";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { getAnalytics } from "@/lib/late/mutations";
import { analyzeResultSchema, type AnalyzeResult } from "@/lib/schemas/accountAnalysis";

export async function analyzeAccount(
  socialAccountId: string
): Promise<AnalyzeResult> {
  // 1. Fetch account + profile + user from DB
  const account = await prisma.socialAccount.findUniqueOrThrow({
    where: { id: socialAccountId },
    include: {
      lateProfile: {
        include: { user: true },
      },
    },
  });

  const { lateProfile } = account;
  const apiKey = lateProfile.lateApiKey;
  const user = lateProfile.user;
  const knowledgeBase = user.knowledgeBase as Record<string, unknown> | null;

  // 2. Fetch external posts from Zernio
  let postsContext = "";
  try {
    const analytics = await getAnalytics(apiKey, {
      source: "external",
      platform: account.platform,
      sortBy: "engagement",
      order: "desc",
      limit: 20,
    });

    if (analytics.posts.length > 0) {
      postsContext = analytics.posts
        .map((p, i) => {
          const eng = p.analytics;
          return `Post ${i + 1}:
Content: ${p.content}
Likes: ${eng.likes} | Comments: ${eng.comments} | Shares: ${eng.shares} | Impressions: ${eng.impressions}
Engagement rate: ${eng.engagementRate}%`;
        })
        .join("\n\n");
    }
  } catch (error) {
    console.error(`[AccountAnalysis] Failed to fetch external posts for ${account.platform}:`, error);
  }

  // 3. Build context for Claude
  const businessContext = knowledgeBase
    ? `Business: ${knowledgeBase.businessName ?? "Unknown"}
Description: ${knowledgeBase.description ?? "No description"}
Services: ${Array.isArray(knowledgeBase.services) ? (knowledgeBase.services as string[]).join(", ") : "Not specified"}`
    : "No business info available.";

  const prompt = postsContext
    ? `You are analyzing a small business owner's ${account.platform} account to understand their content style and generate new post ideas.

${businessContext}

Here are their top-performing posts on ${account.platform}:

${postsContext}

Based on their posting history and business, provide:
1. Insights about their content (topics, style, what works)
2. 5 new post suggestions that match their voice and what performs well

Each suggestion should have a different suggestedDay (0=Monday to 6=Sunday) and suggestedHour (0-23).
For contentType, use: "text", "image", or "carousel".
For reasoning, briefly explain why this post would work for their audience.`
    : `You are helping a small business owner create their first posts on ${account.platform}.

${businessContext}

They haven't posted yet (or we couldn't access their history). Based on their business, generate:
1. Insights about what kind of content would work for their business on ${account.platform}
2. 5 post suggestions tailored to their business and platform

For insights, set postCount to 0, and fill in recommended topics, style, and content mix based on their business type and platform best practices.
Each suggestion should have a different suggestedDay (0=Monday to 6=Sunday) and suggestedHour (0-23).
For contentType, use: "text", "image", or "carousel".
For reasoning, briefly explain why this post would work for their audience.`;

  // 5. Call Claude for analysis + suggestions
  const { object: result } = await generateObject({
    model: anthropic("claude-sonnet-4-6"),
    schema: analyzeResultSchema,
    prompt,
  });

  // 6. Save to DB
  await prisma.socialAccount.update({
    where: { id: socialAccountId },
    data: {
      insights: JSON.parse(JSON.stringify(result.insights)),
      lastAnalyzedAt: new Date(),
    },
  });

  return result;
}
