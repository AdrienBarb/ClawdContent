import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { setPublishingMode } from "@/lib/services/autopilot/publishingMode";
import { captureServerEvent } from "@/lib/tracking/postHogClient";

// Switching to review can un-schedule a whole week from Zernio (one call per
// post); switching to auto commits a staged week. Give it room.
export const maxDuration = 120;

const bodySchema = z.object({
  state: z.enum(["full_auto", "review", "paused"]),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json(
        { error: errorMessages.UNAUTHORIZED },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { state } = bodySchema.parse(body);

    const result = await setPublishingMode({ userId: session.user.id, state });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }

    await captureServerEvent(session.user.id, "autopilot_publishing_mode_set", {
      state,
      effect: result.effect,
      count: result.count,
    });

    return NextResponse.json(result);
  } catch (error) {
    return errorHandler(error);
  }
}
