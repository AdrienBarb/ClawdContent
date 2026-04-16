import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { getFollowerGrowth } from "@/lib/services/analytics";
import { analyticsFollowersQuerySchema } from "@/lib/schemas/analytics";

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
    const params = analyticsFollowersQuerySchema.parse({
      platform: searchParams.get("platform") || undefined,
    });

    const followerStats = await getFollowerGrowth(
      session.user.id,
      params.platform
    );

    return NextResponse.json({ followerStats }, { status: 200 });
  } catch (error) {
    return errorHandler(error);
  }
}
