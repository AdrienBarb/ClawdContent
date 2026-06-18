import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { autopilotSettingsSchema } from "@/lib/schemas/autopilot";
import { setPublishingMode } from "@/lib/services/autopilot/publishingMode";
import { captureServerEvent } from "@/lib/tracking/postHogClient";

// A mode change re-buckets the current week (un-schedule a live week for
// review, commit a staged review week for auto) — give it room, same as the
// dashboard header's publishing-mode route.
export const maxDuration = 120;

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
    const userId = session.user.id;

    // Route the mode change through setPublishingMode (NOT a raw field write)
    // so the User.autopilotMode flag can never drift out of sync with what's
    // actually on the Zernio schedule — a raw write here is exactly how a user
    // ends up "in review" while a week is still auto-publishing. Picking a live
    // mode also resumes (clears autopilotPausedAt), so a `mode` change owns the
    // pause flag too — the `paused` field is only honored on its own (the
    // settings UI toggles them with separate requests).
    if (mode !== undefined) {
      const result = await setPublishingMode({ userId, state: mode });
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 409 });
      }
      await captureServerEvent(userId, "autopilot_mode_switched", { mode });
    } else if (paused !== undefined) {
      // Pause only stops planning new weeks; it leaves the current week exactly
      // as it is, so a direct flag write is correct here (no re-bucketing).
      await prisma.user.update({
        where: { id: userId },
        data: { autopilotPausedAt: paused ? new Date() : null },
      });
      await captureServerEvent(
        userId,
        paused ? "autopilot_paused" : "autopilot_resumed",
        {}
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { autopilotMode: true, autopilotPausedAt: true },
    });

    return NextResponse.json({
      ok: true,
      mode: user?.autopilotMode ?? "full_auto",
      paused: user?.autopilotPausedAt !== null,
    });
  } catch (error) {
    return errorHandler(error);
  }
}
