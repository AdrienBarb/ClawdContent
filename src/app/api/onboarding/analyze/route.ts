import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { limitOnboardingAnalyze } from "@/lib/rateLimit/onboardingLimiter";
import { scrapeAndExtractKnowledgeBase } from "@/lib/services/onboarding";

// Synchronous re-analysis used by the Business settings form (/d/business).
// The onboarding wizard itself runs analysis in the background via Inngest
// (POST /api/onboarding/start) — this route stays for on-demand re-scrapes.
export const maxDuration = 120;

const reAnalyzeSchema = z.object({ websiteUrl: z.string().url() });

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json(
        { error: errorMessages.UNAUTHORIZED },
        { status: 401 }
      );
    }

    const { websiteUrl } = reAnalyzeSchema.parse(await req.json());

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
        { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
      );
    }

    const result = await scrapeAndExtractKnowledgeBase(websiteUrl);
    if (!result.success) {
      return NextResponse.json(
        {
          error:
            "We couldn't access this website. Please check the URL and try again.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { knowledgeBase: result.knowledgeBase },
      { status: 200 }
    );
  } catch (error) {
    return errorHandler(error);
  }
}
