import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { scrapeWebsite, type ScrapeResult } from "@/lib/firecrawl/client";
import { limitOnboardingAnalyze } from "@/lib/rateLimit/onboardingLimiter";
import {
  analyzeInputSchema,
  knowledgeBaseSchema,
} from "@/lib/schemas/knowledgeBase";
import { extractBrandIdentityFromScrape } from "@/lib/services/brandIdentity";

export const maxDuration = 60;

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
    let scrape: ScrapeResult | null = null;

    if (data.websiteUrl) {
      try {
        scrape = await scrapeWebsite(data.websiteUrl);
        contentToAnalyze += `Website content from ${data.websiteUrl}:\n`;
        if (scrape.title) contentToAnalyze += `Page title: ${scrape.title}\n`;
        contentToAnalyze += scrape.markdown;
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

    const { object: knowledgeBase } = await generateObject({
      model: anthropic("claude-sonnet-4-6"),
      schema: knowledgeBaseSchema,
      prompt: `You are analyzing a small business to understand what they do. Extract structured information from the following content.

Be concise and factual. Use the business owner's language.
For "businessName", extract the business or brand name.
For "description", write a clear 1-2 sentence summary of what this business does.
For "services", list the main products or services offered.
Set "source" to "${data.websiteUrl ? "website" : "manual"}".

Content to analyze:
${contentToAnalyze}`,
    });

    const brandIdentity = scrape
      ? extractBrandIdentityFromScrape(scrape)
      : null;

    return NextResponse.json({ knowledgeBase, brandIdentity });
  } catch (error) {
    return errorHandler(error);
  }
}
