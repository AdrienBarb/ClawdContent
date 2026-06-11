import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { after } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { FREE_POST_LIMIT, getPlan, resolvePlanId } from "@/lib/constants/plans";
import { syncAccountsFromLate } from "@/lib/services/accounts";
import { isSupportedPlatform } from "@/lib/insights/platformConfig";

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

    const [user, subscription, lateProfile, latestBatch] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          timezone: true,
          websiteUrl: true,
          knowledgeBase: true,
          postsPublished: true,
          autopilotMode: true,
          autopilotPausedAt: true,
          pendingBrief: true,
        },
      }),
      prisma.subscription.findUnique({ where: { userId } }),
      prisma.lateProfile.findUnique({
        where: { userId },
        include: { socialAccounts: true },
      }),
      prisma.weeklyBatch.findFirst({
        where: { userId },
        orderBy: { weekStart: "desc" },
        select: {
          id: true,
          status: true,
          mode: true,
          weekStart: true,
          digestSentAt: true,
          approvedAt: true,
          posts: true,
          createdAt: true,
        },
      }),
    ]);

    const planId = resolvePlanId(subscription?.planId);
    const plan = getPlan(planId);

    // Legacy accounts on removed platforms stay in the DB but must never
    // surface in the dashboard — filter them out of the status payload.
    const supportedAccounts = (lateProfile?.socialAccounts ?? []).filter((a) =>
      isSupportedPlatform(a.platform)
    );

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
      accountCount: supportedAccounts.filter((a) => a.status === "active")
        .length,
      accounts: supportedAccounts.map((a) => ({
        id: a.id,
        // Zernio account id — lets the UI attribute Zernio posts (which carry
        // platform accountIds) to the right account when two share a platform.
        lateAccountId: a.lateAccountId,
        platform: a.platform,
        username: a.username,
        status: a.status,
        analysisStatus: a.analysisStatus,
        lastAnalyzedAt: a.lastAnalyzedAt?.toISOString() ?? null,
      })),
      postsPublished: user?.postsPublished ?? 0,
      freePostLimit: FREE_POST_LIMIT,
      autopilot: {
        mode: user?.autopilotMode ?? "full_auto",
        paused: user?.autopilotPausedAt !== null,
        pendingBrief: user?.pendingBrief ?? null,
        latestBatch: latestBatch
          ? {
              id: latestBatch.id,
              status: latestBatch.status,
              mode: latestBatch.mode,
              weekStart: latestBatch.weekStart.toISOString(),
              digestSentAt: latestBatch.digestSentAt?.toISOString() ?? null,
              approvedAt: latestBatch.approvedAt?.toISOString() ?? null,
              postCount: Array.isArray(latestBatch.posts)
                ? latestBatch.posts.length
                : 0,
              createdAt: latestBatch.createdAt.toISOString(),
            }
          : null,
      },
    });
  } catch (error) {
    return errorHandler(error);
  }
}
