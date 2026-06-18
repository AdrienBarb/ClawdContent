import { prisma } from "@/lib/db/prisma";
import {
  selectPrimaryAccount,
  buildPaywallPlan,
  type RawAccountInput,
} from "@/lib/insights/paywallPlan";
import { parseBusinessStrategy } from "@/lib/schemas/strategy";
import type { OnboardingGoal } from "@/lib/schemas/onboarding";
import type { KnowledgeBase } from "@/lib/schemas/knowledgeBase";
import type { PaywallPlan } from "@/lib/schemas/onboardingPlan";

/**
 * Assemble the paywall plan: the brand-level `businessStrategy` ("after",
 * ready instantly) plus a best-effort current-state diagnosis ("before") from
 * the primary account's insights when they're ready. Returns null only when
 * there's nothing to show yet (no business strategy AND no connected account) —
 * the client keeps polling until the strategy lands. Read-only: the business
 * strategy is generated (and retried on failure) by the `business-strategy/generate`
 * Inngest job, never here.
 */
export async function getOnboardingPlan(
  userId: string
): Promise<PaywallPlan | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      onboardingGoal: true,
      knowledgeBase: true,
      businessStrategy: true,
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
  const businessStrategy = parseBusinessStrategy(user?.businessStrategy);

  // Nothing to reveal yet → null keeps the client polling (paywall shows
  // "building") until the business strategy lands.
  if (!businessStrategy && !primary) return null;

  const businessName =
    (user?.knowledgeBase as KnowledgeBase | null)?.businessName ?? null;

  return buildPaywallPlan({
    account: primary,
    businessStrategy,
    goal: (user?.onboardingGoal as OnboardingGoal | null) ?? null,
    businessName,
  });
}
