import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { wakeBot } from "@/lib/services/bot";

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

    await wakeBot(session.user.id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return errorHandler(error);
  }
}
