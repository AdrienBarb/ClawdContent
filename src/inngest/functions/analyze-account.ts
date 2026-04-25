import { inngest } from "../client";
import { prisma } from "@/lib/db/prisma";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { getAnalytics } from "@/lib/late/mutations";
import { analyzeResultSchema } from "@/lib/schemas/accountAnalysis";

export const analyzeAccount = inngest.createFunction(
  { id: "analyze-account", retries: 3, triggers: [{ event: "account/connected" }] },
  async ({ event, step }) => {
    const { socialAccountId } = event.data;

    // Load account + profile + user
    const account = await step.run("load-account", async () => {
      const acc = await prisma.socialAccount.findUniqueOrThrow({
        where: { id: socialAccountId },
        include: { lateProfile: { include: { user: true } } },
      });
      return {
        id: acc.id,
        platform: acc.platform,
        apiKey: acc.lateProfile.lateApiKey,
        profileId: acc.lateProfile.lateProfileId,
        knowledgeBase: acc.lateProfile.user.knowledgeBase as Record<string, unknown> | null,

      };
    });

    // Fetch existing posts from the platform
    const postsContext = await step.run("fetch-posts", async () => {
      try {
        const analytics = await getAnalytics(account.apiKey, {
          source: "external",
          platform: account.platform,
          sortBy: "engagement",
          order: "desc",
          limit: 20,
        });

        if (analytics.posts.length === 0) return "";

        return analytics.posts
          .map((p, i) => {
            const eng = p.analytics;
            return `Post ${i + 1}:\nContent: ${p.content}\nLikes: ${eng.likes} | Comments: ${eng.comments} | Shares: ${eng.shares} | Impressions: ${eng.impressions}\nEngagement rate: ${eng.engagementRate}%`;
          })
          .join("\n\n");
      } catch (error) {
        console.error(`[Inngest] Failed to fetch posts for ${account.platform}:`, error);
        return "";
      }
    });

    // Analyze tone + generate suggestions with Claude
    const result = await step.run("analyze-and-generate", async () => {
      const kb = account.knowledgeBase;
      const businessContext = kb
        ? `Business: ${kb.businessName ?? "Unknown"}\nDescription: ${kb.description ?? "No description"}\nServices: ${Array.isArray(kb.services) ? (kb.services as string[]).join(", ") : "Not specified"}`
        : "No business info available.";

      const prompt = postsContext
        ? `You are analyzing a small business owner's ${account.platform} account to understand their tone of voice, writing style, and topics.

${businessContext}

Here are their top-performing posts on ${account.platform}:

${postsContext}

Based on their posting history and business, provide:
1. Insights about their tone of voice, writing style, topics they cover, and what type of content performs well
2. 5 new post suggestions that match their voice and what performs well

Each suggestion should have a different suggestedDay (0=Monday to 6=Sunday) and suggestedHour (0-23).
For contentType, use: "text", "image", or "carousel".
For reasoning, briefly explain why this post would work for their audience.`
        : `You are helping a small business owner create their first posts on ${account.platform}.

${businessContext}

They haven't posted yet. Based on their business, generate:
1. Insights about what kind of content would work for their business on ${account.platform} — recommend a tone of voice, topics, and content style
2. 5 post suggestions tailored to their business and platform

For insights, set postCount to 0, and fill in recommended topics, style, and content mix based on their business type and platform best practices.
Each suggestion should have a different suggestedDay (0=Monday to 6=Sunday) and suggestedHour (0-23).
For contentType, use: "text", "image", or "carousel".
For reasoning, briefly explain why this post would work for their audience.`;

      const { object } = await generateObject({
        model: anthropic("claude-sonnet-4-6"),
        schema: analyzeResultSchema,
        prompt,
      });

      return object;
    });

    // Save everything to DB
    await step.run("save-results", async () => {
      // Save insights to SocialAccount
      await prisma.socialAccount.update({
        where: { id: socialAccountId },
        data: {
          insights: JSON.parse(JSON.stringify(result.insights)),
          lastAnalyzedAt: new Date(),
          analysisStatus: "completed",
        },
      });

      // Save post suggestions
      await prisma.postSuggestion.createMany({
        data: result.suggestions.map((s) => ({
          socialAccountId,
          content: s.content,
          contentType: s.contentType,
          suggestedDay: s.suggestedDay,
          suggestedHour: s.suggestedHour,
          reasoning: s.reasoning,
        })),
      });
    });

    return { success: true, socialAccountId };
  }
);
