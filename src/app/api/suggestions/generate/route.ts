import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { getAnalytics } from "@/lib/late/mutations";
import { z } from "zod";

const generateInputSchema = z.object({
  topic: z.string().optional(),
  accountId: z.string().optional(),
});

const generatedPostsSchema = z.object({
  suggestions: z.array(
    z.object({
      content: z.string(),
      contentType: z.string(),
      suggestedDay: z.number(),
      suggestedHour: z.number(),
      reasoning: z.string(),
    })
  ),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: errorMessages.UNAUTHORIZED }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const input = generateInputSchema.parse(body);

    console.log("[Generate] Input received:", JSON.stringify(input));

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: session.user.id },
      select: { knowledgeBase: true, timezone: true, strategy: true },
    });

    // Get user's active social accounts
    const lateProfile = await prisma.lateProfile.findUnique({
      where: { userId: session.user.id },
      include: { socialAccounts: { where: { status: "active" } } },
    });

    if (!lateProfile || lateProfile.socialAccounts.length === 0) {
      return NextResponse.json({ error: "No connected accounts" }, { status: 400 });
    }

    // Filter to specific account if requested
    const accounts = input.accountId
      ? lateProfile.socialAccounts.filter((a) => a.id === input.accountId)
      : lateProfile.socialAccounts;

    if (accounts.length === 0) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const allSuggestions: { id: string; content: string; contentType: string; suggestedDay: number; suggestedHour: number; reasoning: string | null; socialAccount: { platform: string; username: string } }[] = [];

    console.log("[Generate] Accounts to generate for:", accounts.map(a => ({ id: a.id, platform: a.platform, username: a.username })));

    for (const account of accounts) {
      console.log(`[Generate] Processing account: ${account.platform} @${account.username} (${account.id})`);

      // Delete existing suggestions for this account
      await prisma.postSuggestion.deleteMany({
        where: { socialAccountId: account.id },
      });

      // Fetch recent post performance for context
      let postsContext = "";
      try {
        const analytics = await getAnalytics(lateProfile.lateApiKey, {
          source: "external", platform: account.platform, sortBy: "engagement", order: "desc", limit: 10,
        });
        if (analytics.posts.length > 0) {
          postsContext = analytics.posts
            .slice(0, 5)
            .map((p, i) => `Post ${i + 1}: ${p.content}\nEngagement: ${p.analytics.engagementRate}%`)
            .join("\n\n");
        }
      } catch {
        // ignore
      }

      // Build prompt
      const kb = user.knowledgeBase as Record<string, unknown> | null;
      const businessContext = kb
        ? `Business: ${kb.businessName ?? "Unknown"}\nDescription: ${kb.description ?? "No description"}\nServices: ${Array.isArray(kb.services) ? (kb.services as string[]).join(", ") : "Not specified"}`
        : "No business info available.";

      const platformNames: Record<string, string> = {
        instagram: "Instagram", facebook: "Facebook", twitter: "X (Twitter)",
        threads: "Threads", linkedin: "LinkedIn", tiktok: "TikTok",
        youtube: "YouTube", pinterest: "Pinterest", bluesky: "Bluesky",
      };
      const platformLabel = platformNames[account.platform] ?? account.platform;

      const topicInstruction = input.topic
        ? `\n\nThe user wants posts about this specific topic: "${input.topic}". Make sure all suggestions are related to this topic while staying true to the business voice and platform.`
        : "";

      const prompt = `You are a social media manager for a small business owner. Generate 5 new post suggestions for their ${platformLabel} account.

${businessContext}

${postsContext ? `Here are some of their recent top posts on ${platformLabel} for tone reference:\n\n${postsContext}\n` : ""}
For contentType, use: "text", "image", or "carousel".
For reasoning, briefly explain why this post would work for their audience.${topicInstruction}

Write posts that sound natural and human — not like AI. Match the business owner's voice. Keep posts concise and engaging for ${platformLabel}. Respect ${platformLabel}'s character limits and best practices.`;

      console.log(`[Generate] Prompt for ${account.platform}:\n`, prompt);
      console.log(`[Generate] Posts context available: ${postsContext ? "yes (" + postsContext.split("\n\n").length + " posts)" : "no"}`);

      const { object } = await generateObject({
        model: anthropic("claude-sonnet-4-6"),
        schema: generatedPostsSchema,
        prompt,
      });

      console.log(`[Generate] Claude returned ${object.suggestions.length} suggestions for ${account.platform}`);

      // Save to DB
      const created = await prisma.$transaction(
        object.suggestions.map((s) =>
          prisma.postSuggestion.create({
            data: {
              socialAccountId: account.id,
              content: s.content,
              contentType: s.contentType,
              suggestedDay: s.suggestedDay,
              suggestedHour: s.suggestedHour,
              reasoning: s.reasoning,
            },
            include: { socialAccount: { select: { platform: true, username: true } } },
          })
        )
      );

      allSuggestions.push(...created.map((s) => ({
        id: s.id,
        content: s.content,
        contentType: s.contentType,
        suggestedDay: s.suggestedDay,
        suggestedHour: s.suggestedHour,
        reasoning: s.reasoning,
        socialAccount: s.socialAccount,
      })));
    }

    return NextResponse.json({ suggestions: allSuggestions });
  } catch (error) {
    return errorHandler(error);
  }
}
