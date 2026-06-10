import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { isSupportedPlatform } from "@/lib/insights/platformConfig";
import type {
  OnboardingGoal,
  OnboardingStatus,
  WebsiteAnalysisState,
} from "@/lib/schemas/onboarding";
import type { KnowledgeBase } from "@/lib/schemas/knowledgeBase";

// Polling endpoint for the wizard. Status-only (no Zernio sync) — mirrors
// /api/dashboard/status. Screen 3 polls until websiteAnalysis resolves; the
// final screen polls subscription.status after the subscribe CTA.
export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json(
        { error: errorMessages.UNAUTHORIZED },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        onboardingStep: true,
        onboardingCompletedAt: true,
        websiteUrl: true,
        onboardingGoal: true,
        websiteAnalysis: true,
        knowledgeBase: true,
        subscription: { select: { status: true } },
        lateProfile: {
          select: {
            socialAccounts: {
              where: { status: "active" },
              select: {
                id: true,
                platform: true,
                username: true,
                status: true,
                analysisStatus: true,
              },
            },
          },
        },
      },
    });

    const status: OnboardingStatus = {
      step: user?.onboardingStep ?? 1,
      isCompleted: !!user?.onboardingCompletedAt,
      websiteUrl: user?.websiteUrl ?? null,
      goal: (user?.onboardingGoal as OnboardingGoal | null) ?? null,
      websiteAnalysis:
        (user?.websiteAnalysis as WebsiteAnalysisState | null) ?? null,
      knowledgeBase: (user?.knowledgeBase as KnowledgeBase | null) ?? null,
      accounts: (user?.lateProfile?.socialAccounts ?? []).filter((a) =>
        isSupportedPlatform(a.platform)
      ),
      subscription: user?.subscription ?? null,
    };

    return NextResponse.json(status, { status: 200 });
  } catch (error) {
    return errorHandler(error);
  }
}
