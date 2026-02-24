import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { getConnectUrl } from "@/lib/services/accounts";
import { connectAccountSchema } from "@/lib/schemas/accounts";
import { appRouter } from "@/lib/constants/appRouter";

export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const { platform } = connectAccountSchema.parse(body);

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const redirectUrl = `${baseUrl}${appRouter.accountsCallback}`;

    const url = await getConnectUrl(session.user.id, platform, redirectUrl);

    return NextResponse.json({ url }, { status: 200 });
  } catch (error) {
    return errorHandler(error);
  }
}
