import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { analyzeInputSchema } from "@/lib/schemas/accountAnalysis";
import { analyzeAccount } from "@/lib/services/accountAnalysis";

export const maxDuration = 60;

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
    const { accountId } = analyzeInputSchema.parse(body);

    // Verify account belongs to user
    const account = await prisma.socialAccount.findFirst({
      where: {
        id: accountId,
        lateProfile: { userId: session.user.id },
      },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    const result = await analyzeAccount(accountId);

    return NextResponse.json(result);
  } catch (error) {
    return errorHandler(error);
  }
}
