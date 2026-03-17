import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { activateTrialNow } from "@/lib/services/subscription";
import { grantPlanCredits } from "@/lib/services/credits";
import { prisma } from "@/lib/db/prisma";
import { type PlanId } from "@/lib/constants/plans";

export async function POST() {
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

    await activateTrialNow(session.user.id);

    // Grant plan credits now that subscription is active
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    });
    if (subscription) {
      await grantPlanCredits(
        session.user.id,
        (subscription.planId || "pro") as PlanId
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_TRIALING") {
      return NextResponse.json(
        { error: "Your subscription is not in trial." },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message === "NO_SUBSCRIPTION") {
      return NextResponse.json(
        { error: errorMessages.SUBSCRIPTION_NOT_FOUND },
        { status: 404 }
      );
    }
    return errorHandler(error);
  }
}
