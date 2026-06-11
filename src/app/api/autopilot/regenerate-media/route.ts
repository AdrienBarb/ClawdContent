import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { regenerateSuggestionMedia } from "@/lib/services/autopilot/regenerateMedia";

export const maxDuration = 180; // image generation + OCR guard round-trips

const bodySchema = z.object({ suggestionId: z.string().min(1) });

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
    const { suggestionId } = bodySchema.parse(body);

    const result = await regenerateSuggestionMedia({
      userId: session.user.id,
      suggestionId,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === "not_found" ? 404 : 502 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    return errorHandler(error);
  }
}
