import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getOnboardingPlan } from "@/lib/services/onboardingPlan";
import { getDistinctId } from "@/lib/tracking/distinctId";
import { resolvePaywallVariant } from "@/lib/services/paywallExperiment";
import type { PaywallPlanResponse } from "@/lib/schemas/onboardingPlan";

// GET: the paywall view-model — the brand-level strategy ("after") plus a
// best-effort current-state diagnosis ("before"). null only when neither a
// businessStrategy nor a connected account exists yet. Read-only — business
// strategy generation + retries live in the business-strategy/generate Inngest job.
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
    if (!plan) return NextResponse.json(null, { status: 200 });

    // Subscribe-footer A/B variant — resolved here (route boundary) from the
    // anonymous distinct-id cookie, so the pure plan builder stays unaware of
    // the experiment. Same distinct id the checkout route reads → consistent.
    const paywallVariant = await resolvePaywallVariant(await getDistinctId());
    const response: PaywallPlanResponse = { ...plan, paywallVariant };
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return errorHandler(error);
  }
}
