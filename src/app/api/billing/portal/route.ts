import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { createPortalSession } from "@/lib/services/subscription";
import { NextResponse } from "next/server";
import { headers } from "next/headers";

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

    const url = await createPortalSession(session.user.id);

    return NextResponse.json({ url }, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === "NO_SUBSCRIPTION") {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 }
      );
    }
    return errorHandler(error);
  }
}
