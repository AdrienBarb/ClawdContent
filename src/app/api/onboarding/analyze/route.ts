import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { scrapeWebsite } from "@/lib/firecrawl/client";
import {
  analyzeInputSchema,
  knowledgeBaseSchema,
} from "@/lib/schemas/knowledgeBase";

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

    let contentToAnalyze = "";

    if (data.websiteUrl) {
      try {
        const { markdown, title } = await scrapeWebsite(data.websiteUrl);
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

    return NextResponse.json({ knowledgeBase });
  } catch (error) {
    return errorHandler(error);
  }
}
