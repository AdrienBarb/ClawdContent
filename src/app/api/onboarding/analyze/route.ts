import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { scrapeWebsite } from "@/lib/firecrawl/client";
import { mapFirecrawlBranding, mergeBranding } from "@/lib/firecrawl/branding";
import { limitOnboardingAnalyze } from "@/lib/rateLimit/onboardingLimiter";
import {
  analyzeInputSchema,
  analyzeLLMSchema,
  type KnowledgeBase,
} from "@/lib/schemas/knowledgeBase";
import type { BrandingProfile, DocumentMetadata } from "@mendable/firecrawl-js";

// The `branding` format runs a full browser render, so the scrape is heavier
// than a markdown-only one; give it headroom alongside the analysis call.
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) {
      return NextResponse.json(
        { error: errorMessages.UNAUTHORIZED },
        { status: 401 }
      );
    }

    const body = await req.json();
    const data = analyzeInputSchema.parse(body);

    const limit = await limitOnboardingAnalyze(session.user.id);
    if (!limit.success) {
      const retryAfterSec = limit.reset
        ? Math.max(1, Math.ceil((limit.reset - Date.now()) / 1000))
        : 60;
      return NextResponse.json(
        {
          error: "Too many analysis attempts. Try again in a moment.",
          retryAfterSeconds: retryAfterSec,
        },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfterSec) },
        }
      );
    }

    let contentToAnalyze = "";
    let firecrawlBranding: BrandingProfile | undefined;
    let firecrawlMetadata: DocumentMetadata | undefined;

    if (data.websiteUrl) {
      try {
        const { markdown, title, branding, metadata } = await scrapeWebsite(
          data.websiteUrl
        );
        firecrawlBranding = branding;
        firecrawlMetadata = metadata;
        contentToAnalyze += `Website content from ${data.websiteUrl}:\n`;
        if (title) contentToAnalyze += `Page title: ${title}\n`;
        contentToAnalyze += markdown;
      } catch {
        return NextResponse.json(
          {
            error:
              "We couldn't access this website. Please check the URL or describe your business instead.",
          },
          { status: 422 }
        );
      }
    }

    if (data.businessDescription) {
      contentToAnalyze += `\n\nBusiness description provided by the owner:\n${data.businessDescription}`;
    }

    // The model handles the verbal identity (business facts + voice / style /
    // tagline). Visual branding (colours, fonts, logo) comes from Firecrawl —
    // we do NOT ask the model to invent it.
    const { object: llm } = await generateObject({
      model: anthropic("claude-sonnet-4-6"),
      schema: analyzeLLMSchema,
      prompt: `You are analyzing a small business to understand what they do and how they sound. Extract structured information from the following content.

Be concise and factual. Use the business owner's language and write in the same language as the content.
For "businessName", extract the business or brand name.
For "description", write a clear 1-2 sentence summary of what this business does.
For "services", list the main products or services offered.
For "brandVoice", write ONE sentence describing the brand's tone of voice (e.g. "Warm and conversational, speaks directly to busy parents").
For "styleAdjectives", give 3-5 adjectives capturing the brand's overall style (e.g. "playful", "premium", "down-to-earth"). If the content is too thin to tell, return fewer rather than inventing.
For "tagline", extract the brand's tagline or slogan if one is evident. Return an empty string if there is none — do not invent one.

Content to analyze:
${contentToAnalyze}`,
    });

    const visualBranding = mapFirecrawlBranding(
      firecrawlBranding,
      firecrawlMetadata
    );
    const branding = mergeBranding(visualBranding, llm);

    const knowledgeBase: KnowledgeBase = {
      businessName: llm.businessName,
      description: llm.description,
      services: llm.services,
      source: data.websiteUrl ? "website" : "manual",
      branding,
    };

    return NextResponse.json({ knowledgeBase });
  } catch (error) {
    return errorHandler(error);
  }
}
