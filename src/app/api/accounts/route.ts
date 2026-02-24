import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getConnectedAccounts } from "@/lib/services/accounts";

export async function GET() {
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

    const accounts = await getConnectedAccounts(session.user.id);

    return NextResponse.json({ accounts }, { status: 200 });
  } catch (error) {
    return errorHandler(error);
  }
}
