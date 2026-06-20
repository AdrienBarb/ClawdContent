import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { isSupportedPlatform } from "@/lib/insights/platformConfig";
import { computeEffectiveResumeStep } from "@/lib/services/onboarding";
import type {
  OnboardingGoal,
  OnboardingStatus,
  WebsiteAnalysisState,
} from "@/lib/schemas/onboarding";
import type { KnowledgeBase } from "@/lib/schemas/knowledgeBase";

// Polling endpoint for the wizard. Status-only (no Zernio sync) — mirrors
// /api/dashboard/status. Screen 4 polls until websiteAnalysis resolves; the
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
        businessDescription: true,
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

    const accounts = (user?.lateProfile?.socialAccounts ?? []).filter((a) =>
      isSupportedPlatform(a.platform)
    );

    const status: OnboardingStatus = {
      // Clamp a reaped returnee (incomplete, 0 connected accounts) back to the
      // Connect step so the client wizard's forward-only reconcile can't strand
      // them past it.
      step: computeEffectiveResumeStep(
        user?.onboardingStep,
        user?.onboardingCompletedAt,
        accounts.length
      ),
      isCompleted: !!user?.onboardingCompletedAt,
      websiteUrl: user?.websiteUrl ?? null,
      businessDescription: user?.businessDescription ?? null,
      goal: (user?.onboardingGoal as OnboardingGoal | null) ?? null,
      websiteAnalysis:
        (user?.websiteAnalysis as WebsiteAnalysisState | null) ?? null,
      knowledgeBase: (user?.knowledgeBase as KnowledgeBase | null) ?? null,
      accounts,
      subscription: user?.subscription ?? null,
    };

    return NextResponse.json(status, { status: 200 });
  } catch (error) {
    return errorHandler(error);
  }
}
