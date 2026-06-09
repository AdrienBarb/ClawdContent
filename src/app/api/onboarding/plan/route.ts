import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getOnboardingPlan } from "@/lib/services/onboardingPlan";

// GET: the paywall before/after view-model for the user's primary account
// (null when none). Read-only — strategy generation + retries live in the
// analyze-account Inngest job.
export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json(
        { error: errorMessages.UNAUTHORIZED },
        { status: 401 }
      );
    }

    const plan = await getOnboardingPlan(session.user.id);
    return NextResponse.json(plan, { status: 200 });
  } catch (error) {
    return errorHandler(error);
  }
}
