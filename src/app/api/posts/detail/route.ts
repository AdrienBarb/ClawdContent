import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { getUserPost } from "@/lib/services/posts";
import { z } from "zod";

const querySchema = z.object({
  postId: z.string().min(1),
});

export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const { postId } = querySchema.parse({
      postId: searchParams.get("postId") || undefined,
    });

    const post = await getUserPost(session.user.id, postId);

    return NextResponse.json({ post }, { status: 200 });
  } catch (error) {
    return errorHandler(error);
  }
}
