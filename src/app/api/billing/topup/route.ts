import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createTopupCheckoutSession } from "@/lib/services/topup";

export async function POST() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json(
        { error: errorMessages.UNAUTHORIZED },
        { status: 401 }
      );
    }

    const url = await createTopupCheckoutSession(
      session.user.id,
      session.user.email
    );
    return NextResponse.json({ url });
  } catch (error) {
    return errorHandler(error);
  }
}
