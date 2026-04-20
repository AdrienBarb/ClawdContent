import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { getOverviewMetrics } from "@/lib/services/analytics";
import { analyticsQuerySchema } from "@/lib/schemas/analytics";

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
    const params = analyticsQuerySchema.parse({
      period: searchParams.get("period") || undefined,
      platform: searchParams.get("platform") || undefined,
    });

    const data = await getOverviewMetrics(
      session.user.id,
      params.period,
      params.platform
    );

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return errorHandler(error);
  }
}
