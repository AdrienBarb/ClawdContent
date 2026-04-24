import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { syncAccountsFromLate } from "@/lib/services/accounts";
import { inngest } from "@/inngest";
import { prisma } from "@/lib/db/prisma";

export async function POST() {
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

    const { newAccounts } = await syncAccountsFromLate(session.user.id);

    // Trigger analysis for each new account
    for (const account of newAccounts) {
      await prisma.socialAccount.update({
        where: { id: account.id },
        data: { analysisStatus: "analyzing" },
      });

      await inngest.send({
        name: "account/connected",
        data: { socialAccountId: account.id, userId: session.user.id },
      });
    }

    return NextResponse.json(
      { success: true, newAccounts },
      { status: 200 }
    );
  } catch (error) {
    return errorHandler(error);
  }
}
