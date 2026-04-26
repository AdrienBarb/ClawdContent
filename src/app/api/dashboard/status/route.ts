import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { after } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getPlan, type PlanId } from "@/lib/constants/plans";
import { syncAccountsFromLate } from "@/lib/services/accounts";

// Throttle account sync: once per user per 60 seconds
const lastSyncMap = new Map<string, number>();
const SYNC_INTERVAL_MS = 60_000;

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

    const [user, subscription, lateProfile] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          timezone: true,
          websiteUrl: true,
          knowledgeBase: true,
          postsPublished: true,
        },
      }),
      prisma.subscription.findUnique({ where: { userId } }),
      prisma.lateProfile.findUnique({
        where: { userId },
        include: { socialAccounts: true },
      }),
    ]);

    const planId = (subscription?.planId as PlanId) || "pro";
    const plan = getPlan(planId);

    // Background sync: check Zernio account statuses periodically
    if (lateProfile) {
      const now = Date.now();
      const lastSync = lastSyncMap.get(userId) ?? 0;
      if (now - lastSync > SYNC_INTERVAL_MS) {
        lastSyncMap.set(userId, now);
        after(async () => {
          try {
            await syncAccountsFromLate(userId);
          } catch (e) {
            console.error("[Dashboard] Background account sync failed:", e);
          }
        });
      }
    }

    return NextResponse.json({
      timezone: user?.timezone ?? null,
      websiteUrl: user?.websiteUrl ?? null,
      knowledgeBase: user?.knowledgeBase ?? null,
      hasKnowledgeBase: !!user?.knowledgeBase,
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
      accountCount:
        lateProfile?.socialAccounts?.filter((a) => a.status === "active")
          .length ?? 0,
      accounts:
        lateProfile?.socialAccounts?.map((a) => ({
          id: a.id,
          platform: a.platform,
          username: a.username,
          status: a.status,
          analysisStatus: a.analysisStatus,
          lastAnalyzedAt: a.lastAnalyzedAt?.toISOString() ?? null,
        })) ?? [],
      postsPublished: user?.postsPublished ?? 0,
      freePostLimit: 5,
    });
  } catch (error) {
    return errorHandler(error);
  }
}
