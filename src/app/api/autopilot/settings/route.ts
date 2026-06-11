import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { autopilotSettingsSchema } from "@/lib/schemas/autopilot";
import { captureServerEvent } from "@/lib/tracking/postHogClient";

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json(
        { error: errorMessages.UNAUTHORIZED },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { mode, paused } = autopilotSettingsSchema.parse(body);

    const data: { autopilotMode?: string; autopilotPausedAt?: Date | null } = {};
    if (mode !== undefined) data.autopilotMode = mode;
    if (paused !== undefined) data.autopilotPausedAt = paused ? new Date() : null;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ ok: true });
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data,
      select: { autopilotMode: true, autopilotPausedAt: true },
    });

    if (mode !== undefined) {
      await captureServerEvent(session.user.id, "autopilot_mode_switched", {
        mode,
      });
    }
    if (paused !== undefined) {
      await captureServerEvent(
        session.user.id,
        paused ? "autopilot_paused" : "autopilot_resumed",
        {}
      );
    }

    return NextResponse.json({
      ok: true,
      mode: user.autopilotMode,
      paused: user.autopilotPausedAt !== null,
    });
  } catch (error) {
    return errorHandler(error);
  }
}
