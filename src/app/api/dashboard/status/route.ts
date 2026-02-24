import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { getBotStatus } from "@/lib/services/bot";

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

    const userId = session.user.id;

    const [subscription, botStatus, lateProfile] = await Promise.all([
      prisma.subscription.findUnique({ where: { userId } }),
      getBotStatus(userId),
      prisma.lateProfile.findUnique({
        where: { userId },
        include: { socialAccounts: { where: { status: "active" } } },
      }),
    ]);

    return NextResponse.json({
      subscription: subscription
        ? {
            status: subscription.status,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            currentPeriodEnd: subscription.currentPeriodEnd,
          }
        : null,
      botStatus: botStatus?.status ?? null,
      hasTelegramToken: botStatus?.hasTelegramToken ?? false,
      accountCount: lateProfile?.socialAccounts?.length ?? 0,
      accounts:
        lateProfile?.socialAccounts?.map((a) => ({
          id: a.id,
          platform: a.platform,
          username: a.username,
          status: a.status,
        })) ?? [],
    });
  } catch (error) {
    return errorHandler(error);
  }
}
