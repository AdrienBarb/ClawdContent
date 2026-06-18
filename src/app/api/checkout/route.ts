import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { createCheckoutSession } from "@/lib/services/subscription";
import { checkoutSchema } from "@/lib/schemas/checkout";
import { NextResponse, NextRequest, after } from "next/server";
import { headers, cookies } from "next/headers";
import { getDistinctId } from "@/lib/tracking/distinctId";
import {
  resolvePaywallVariant,
  getIntroCouponId,
} from "@/lib/services/paywallExperiment";
import { captureServerEvent } from "@/lib/tracking/postHogClient";

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
    const { planId, interval, successUrl } = checkoutSchema.parse(body);

    const cookieStore = await cookies();
    const affonsoReferral = cookieStore.get("affonso_referral")?.value || "";

    // Resolve the paywall A/B variant server-side (never trust the client for a
    // pricing decision). Same distinct id the plan endpoint read → the user is
    // charged exactly what their footer showed. Coupon applied only when the
    // discount variant is configured.
    const distinctId = await getDistinctId();
    const paywallVariant = await resolvePaywallVariant(distinctId);
    const couponId =
      paywallVariant === "discount" ? getIntroCouponId() : undefined;

    if (distinctId) {
      after(() =>
        captureServerEvent(distinctId, "paywall_checkout_started", {
          userId: session.user.id,
          variant: paywallVariant,
        })
      );
    }

    const url = await createCheckoutSession(
      session.user.id,
      session.user.email,
      planId,
      interval,
      affonsoReferral,
      successUrl,
      { couponId, paywallVariant, distinctId }
    );

    return NextResponse.json({ url }, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === "ALREADY_SUBSCRIBED") {
      return NextResponse.json(
        { error: errorMessages.ALREADY_SUBSCRIBED },
        { status: 409 }
      );
    }
    return errorHandler(error);
  }
}
