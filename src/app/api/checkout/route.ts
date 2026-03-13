import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { createCheckoutSession } from "@/lib/services/subscription";
import { NextResponse, NextRequest } from "next/server";
import { headers, cookies } from "next/headers";

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

    const cookieStore = await cookies();
    const affonsoReferral = cookieStore.get("affonso_referral")?.value || "";

    const url = await createCheckoutSession(
      session.user.id,
      session.user.email,
      affonsoReferral
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
