import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { triggerManualWeekFill } from "@/lib/services/autopilot/generateNow";
import { captureServerEvent } from "@/lib/tracking/postHogClient";

export async function POST() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json(
        { error: errorMessages.UNAUTHORIZED },
        { status: 401 }
      );
    }

    const result = await triggerManualWeekFill({ userId: session.user.id });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }

    await captureServerEvent(session.user.id, "autopilot_manual_fill_triggered", {
      weekStart: result.weekStart,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorHandler(error);
  }
}
