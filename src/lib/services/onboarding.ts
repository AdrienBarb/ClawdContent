import { prisma } from "@/lib/db/prisma";

export type OnboardingStage =
  | "needs_kb" // hasn't filled the URL/description step yet
  | "needs_brand" // KB done, brand identity missing
  | "needs_social" // brand done, no connected social
  | "needs_checkout" // steps 1-4 done, no active/trialing subscription
  | "frozen" // had a subscription that lapsed (past_due / canceled)
  | "complete"; // active or trialing subscription

export interface OnboardingStatus {
  stage: OnboardingStage;
  completed: boolean;
  /** Subscription status when stage === "frozen" (only "past_due" or "canceled"). */
  frozenStatus?: "past_due" | "canceled";
}

export const ACTIVE_SUBSCRIPTION_STATUSES = ["active", "trialing"] as const;

type ActiveStatus = (typeof ACTIVE_SUBSCRIPTION_STATUSES)[number];
type FrozenStatus = "past_due" | "canceled";

function isActive(status: string | null | undefined): status is ActiveStatus {
  return status === "active" || status === "trialing";
}

function isFrozen(status: string | null | undefined): status is FrozenStatus {
  return status === "past_due" || status === "canceled";
}

/**
 * Single source of truth for "where in onboarding is this user?". Every
 * layout / gate route reads from this so the redirect rules don't drift.
 * Folds the three required reads into one User.findUnique with relations.
 */
export async function computeOnboardingStatus(
  userId: string
): Promise<OnboardingStatus> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      knowledgeBase: true,
      brandIdentity: true,
      subscription: { select: { status: true } },
      lateProfile: {
        select: {
          socialAccounts: {
            where: { status: "active" },
            select: { id: true },
          },
        },
      },
    },
  });

  if (!user?.knowledgeBase) {
    return { stage: "needs_kb", completed: false };
  }
  if (!user.brandIdentity) {
    return { stage: "needs_brand", completed: false };
  }
  const socialCount = user.lateProfile?.socialAccounts.length ?? 0;
  if (socialCount === 0) {
    return { stage: "needs_social", completed: false };
  }

  const subStatus = user.subscription?.status ?? null;
  if (isActive(subStatus)) {
    return { stage: "complete", completed: true };
  }
  if (isFrozen(subStatus)) {
    return { stage: "frozen", completed: false, frozenStatus: subStatus };
  }
  return { stage: "needs_checkout", completed: false };
}
