import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { provisionUser } from "@/lib/services/provisioning";
import { prisma } from "@/lib/db/prisma";

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

    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    });

    if (
      !subscription ||
      (subscription.status !== "active" && subscription.status !== "trialing")
    ) {
      return NextResponse.json(
        { error: errorMessages.SUBSCRIPTION_REQUIRED },
        { status: 403 }
      );
    }

    await provisionUser(session.user.id, session.user.name);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return errorHandler(error);
  }
}
