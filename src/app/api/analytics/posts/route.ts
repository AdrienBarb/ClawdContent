import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { getTopPosts } from "@/lib/services/analytics";
import { analyticsPostsQuerySchema } from "@/lib/schemas/analytics";

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
    const params = analyticsPostsQuerySchema.parse({
      limit: searchParams.get("limit") || undefined,
      fromDate: searchParams.get("fromDate") || undefined,
      toDate: searchParams.get("toDate") || undefined,
    });

    const posts = await getTopPosts(session.user.id, params);

    return NextResponse.json({ posts }, { status: 200 });
  } catch (error) {
    return errorHandler(error);
  }
}
