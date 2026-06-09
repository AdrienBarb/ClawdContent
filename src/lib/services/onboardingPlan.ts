import { prisma } from "@/lib/db/prisma";
import {
  selectPrimaryAccount,
  buildPaywallPlan,
  type RawAccountInput,
} from "@/lib/insights/paywallPlan";
import type { OnboardingGoal } from "@/lib/schemas/onboarding";
import type { KnowledgeBase } from "@/lib/schemas/knowledgeBase";
import type { PaywallPlan } from "@/lib/schemas/onboardingPlan";

/**
 * Read the user's primary account and assemble the paywall before/after plan.
 * Returns null when the user has no active, supported account. Read-only — the
 * strategy is generated (and retried on failure) by the analyze-account Inngest
 * job, never here.
 */
export async function getOnboardingPlan(
  userId: string
): Promise<PaywallPlan | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      onboardingGoal: true,
      knowledgeBase: true,
      lateProfile: {
        select: {
          socialAccounts: {
            where: { status: "active" },
            select: {
              id: true,
              platform: true,
              username: true,
              analysisStatus: true,
              insights: true,
              strategy: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });

  const accounts: RawAccountInput[] = user?.lateProfile?.socialAccounts ?? [];
  const primary = selectPrimaryAccount(accounts);
  if (!primary) return null;

  const businessName =
    (user?.knowledgeBase as KnowledgeBase | null)?.businessName ?? null;

  return buildPaywallPlan({
    account: primary,
    goal: (user?.onboardingGoal as OnboardingGoal | null) ?? null,
    businessName,
  });
}
