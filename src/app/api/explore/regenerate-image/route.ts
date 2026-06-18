import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { renderComposeImage } from "@/lib/services/composePost";

export const maxDuration = 180; // image generation + OCR guard round-trips

const bodySchema = z.object({
  accountId: z.string().min(1),
  content: z.string().trim().min(1).max(10000),
  mediaPlan: z.unknown().optional(),
  instruction: z.string().trim().max(500).optional(),
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

    const { accountId, content, mediaPlan, instruction } = bodySchema.parse(
      await req.json()
    );
    const result = await renderComposeImage({
      userId: session.user.id,
      accountId,
      content,
      mediaPlan,
      instruction,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === "not_found" ? 404 : 502 }
      );
    }

    return NextResponse.json({
      mediaItems: result.mediaItems,
      mediaPlan: result.mediaPlan,
    });
  } catch (error) {
    return errorHandler(error);
  }
}
