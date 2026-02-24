import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { getUserPosts } from "@/lib/services/posts";
import { listPostsQuerySchema } from "@/lib/schemas/posts";

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
    const params = listPostsQuerySchema.parse({
      status: searchParams.get("status") || undefined,
      limit: searchParams.get("limit") || undefined,
    });

    const posts = await getUserPosts(session.user.id, params);

    return NextResponse.json({ posts }, { status: 200 });
  } catch (error) {
    return errorHandler(error);
  }
}
