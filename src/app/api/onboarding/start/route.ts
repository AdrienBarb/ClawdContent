import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { inngest } from "@/inngest";
import { limitOnboardingAnalyze } from "@/lib/rateLimit/onboardingLimiter";
import {
  onboardingStartSchema,
  type WebsiteAnalysisState,
} from "@/lib/schemas/onboarding";

// Screen 1: store the URL, advance to screen 2, and kick off the background
// scrape+extract job. We do NOT await the job — the user connects socials while
// it runs and screen 3 polls /api/onboarding/status for the result.
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json(
        { error: errorMessages.UNAUTHORIZED },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { websiteUrl } = onboardingStartSchema.parse(body);

    // Same paid Firecrawl + Claude pipeline as /api/onboarding/analyze — cap it
    // to block credit-burn loops.
    const limit = await limitOnboardingAnalyze(session.user.id);
    if (!limit.success) {
      const retryAfterSec = limit.reset
        ? Math.max(1, Math.ceil((limit.reset - Date.now()) / 1000))
        : 60;
      return NextResponse.json(
        {
          error: "Too many attempts. Try again in a moment.",
          retryAfterSeconds: retryAfterSec,
        },
        { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
      );
    }

    const pending: WebsiteAnalysisState = { status: "pending" };
    await prisma.user.update({
      where: { id: session.user.id },
      data: { websiteUrl, onboardingStep: 2, websiteAnalysis: pending },
    });

    await inngest.send({
      name: "onboarding/website-analyze",
      data: { userId: session.user.id, websiteUrl },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return errorHandler(error);
  }
}
