import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { composePost } from "@/lib/services/composePost";

export const maxDuration = 240; // caption + image generation + OCR guard round-trips

const bodySchema = z.object({
  accountId: z.string().min(1),
  brief: z.string().trim().min(1).max(4000),
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

    const { accountId, brief } = bodySchema.parse(await req.json());
    const result = await composePost({
      userId: session.user.id,
      accountId,
      brief,
    });

    if (!result.ok) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    return NextResponse.json({ post: result.post });
  } catch (error) {
    return errorHandler(error);
  }
}
