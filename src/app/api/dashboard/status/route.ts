import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { getBotStatus } from "@/lib/services/bot";
import { getPlan, type PlanId } from "@/lib/constants/plans";
import { getCreditBalance } from "@/lib/services/credits";

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

    const [user, subscription, botStatus, lateProfile, credits] =
      await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: { timezone: true },
        }),
        prisma.subscription.findUnique({ where: { userId } }),
        getBotStatus(userId),
        prisma.lateProfile.findUnique({
          where: { userId },
          include: { socialAccounts: true },
        }),
        getCreditBalance(userId),
      ]);

    const planId = (subscription?.planId as PlanId) || "starter";
    const plan = getPlan(planId);

    return NextResponse.json({
      timezone: user?.timezone ?? null,
      subscription: subscription
        ? {
            status: subscription.status,
            planId: subscription.planId,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            currentPeriodEnd: subscription.currentPeriodEnd,
          }
        : null,
      plan: {
        id: planId,
        name: plan.name,
        socialAccountLimit: plan.socialAccountLimit,
      },
      botStatus: botStatus?.status ?? null,
      accountCount:
        lateProfile?.socialAccounts?.filter((a) => a.status === "active")
          .length ?? 0,
      accounts:
        lateProfile?.socialAccounts?.map((a) => ({
          id: a.id,
          platform: a.platform,
          username: a.username,
          status: a.status,
        })) ?? [],
      credits,
    });
  } catch (error) {
    return errorHandler(error);
  }
}
