import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { limitOnboardingAnalyze } from "@/lib/rateLimit/onboardingLimiter";
import { onboardingStartSchema } from "@/lib/schemas/onboarding";
import { startOnboardingAnalysis } from "@/lib/services/onboarding";
import { getDistinctId } from "@/lib/tracking/distinctId";

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
    const { websiteUrl, businessDescription } = onboardingStartSchema.parse(body);

    // Both paths burn model credits (Firecrawl + Claude for a URL, Claude for a
    // description) — cap it to block credit-burn loops.
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

    const distinctId = await getDistinctId();
    await startOnboardingAnalysis(
      session.user.id,
      { websiteUrl, businessDescription },
      distinctId
    );

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return errorHandler(error);
  }
}
