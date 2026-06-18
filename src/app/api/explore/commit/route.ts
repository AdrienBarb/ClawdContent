import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { mediaItemsSchema } from "@/lib/schemas/mediaItems";
import { commitComposedPost } from "@/lib/services/commitComposedPost";
import { publishResultToResponse } from "@/lib/http/publishResultResponse";

export const maxDuration = 60; // Zernio publish/schedule round-trip

const bodySchema = z.object({
  accountId: z.string().min(1),
  content: z.string().trim().min(1).max(10000),
  mediaItems: mediaItemsSchema.optional(),
  action: z.enum(["publish", "schedule"]),
  scheduledAt: z.string().datetime().optional(),
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

    const body = bodySchema.parse(await req.json());
    const result = await commitComposedPost({
      userId: session.user.id,
      ...body,
    });

    // The ephemeral row is deleted on a partial success, so /explore surfaces
    // partials as a plain success — the timeline refetch shows the live post.
    return publishResultToResponse(result, {
      notFoundMessage: "Account not found",
      treatPartialAsSuccess: true,
    });
  } catch (error) {
    return errorHandler(error);
  }
}
