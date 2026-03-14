import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { changePlan } from "@/lib/services/subscription";
import { changePlanSchema } from "@/lib/schemas/checkout";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";

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
    const { planId, interval } = changePlanSchema.parse(body);

    await changePlan(session.user.id, planId, interval);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "NO_SUBSCRIPTION") {
        return NextResponse.json(
          { error: "No active subscription found" },
          { status: 404 }
        );
      }
      if (error.message === "SUBSCRIPTION_NOT_ACTIVE") {
        return NextResponse.json(
          { error: "Subscription is not active" },
          { status: 400 }
        );
      }
      if (error.message === "SAME_PLAN") {
        return NextResponse.json(
          { error: "You are already on this plan" },
          { status: 400 }
        );
      }
    }
    return errorHandler(error);
  }
}
