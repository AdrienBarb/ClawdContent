import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { getChannelHeaderStats } from "@/lib/services/channelStats";
import { channelStatsQuerySchema } from "@/lib/schemas/analytics";

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
    const params = channelStatsQuerySchema.parse({
      accountId: searchParams.get("accountId") || undefined,
    });

    const data = await getChannelHeaderStats(session.user.id, params.accountId);

    if (!data) {
      return NextResponse.json(null, { status: 200 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return errorHandler(error);
  }
}
