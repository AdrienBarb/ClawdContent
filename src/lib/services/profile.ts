import { prisma } from "@/lib/db/prisma";
import {
  createProfile,
  createScopedApiKey,
} from "@/lib/late/mutations";

export async function ensureUserProfile(
  userId: string,
  userName: string
): Promise<{ profileId: string; apiKey: string }> {
  const existing = await prisma.lateProfile.findUnique({
    where: { userId },
  });

  if (existing) {
    return { profileId: existing.lateProfileId, apiKey: existing.lateApiKey };
  }

  const profile = await createProfile(`postclaw-${userId}`);
  const scopedKey = await createScopedApiKey(profile.id);

  const lateProfile = await prisma.lateProfile.create({
    data: {
      userId,
      lateProfileId: profile.id,
      lateApiKey: scopedKey.key,
      profileName: userName,
    },
  });

  return { profileId: lateProfile.lateProfileId, apiKey: lateProfile.lateApiKey };
}

export async function cleanupUserProfile(userId: string): Promise<void> {
  await prisma.socialAccount.deleteMany({
    where: { lateProfile: { userId } },
  });
  await prisma.lateProfile.deleteMany({ where: { userId } });
}

import { ROLE_LABELS, GOAL_LABELS } from "@/lib/constants/onboarding";

export function formatUserContext(user: {
  onboardingRole: string | null;
  onboardingNiche: string | null;
  onboardingTopics: string[];
  onboardingGoal?: string | null;
  strategy?: unknown;
}): string {
  const parts: string[] = [];

  if (user.onboardingRole) {
    parts.push(`Role: ${ROLE_LABELS[user.onboardingRole] ?? user.onboardingRole}`);
  }
  if (user.onboardingNiche) {
    parts.push(`Niche: ${user.onboardingNiche}`);
  }
  // Show goal only if strategy doesn't have its own goal (avoid duplicate)
  const strategyGoal = user.strategy && typeof user.strategy === "object"
    ? (user.strategy as Record<string, unknown>).goal
    : undefined;
  if (user.onboardingGoal && !strategyGoal) {
    parts.push(`Goal: ${GOAL_LABELS[user.onboardingGoal] ?? user.onboardingGoal}`);
  }
  // Show topics only as legacy fallback (when no strategy exists yet)
  if (user.onboardingTopics.length > 0 && !user.strategy) {
    parts.push(`Topics: ${user.onboardingTopics.join(", ")}`);
  }

  return parts.length > 0
    ? parts.join("\n")
    : "No profile information provided yet.";
}

export async function buildAccountsContext(userId: string): Promise<string> {
  const lateProfile = await prisma.lateProfile.findUnique({
    where: { userId },
    include: { socialAccounts: { where: { status: "active" } } },
  });

  if (!lateProfile || lateProfile.socialAccounts.length === 0) {
    return "No accounts connected yet.";
  }

  return lateProfile.socialAccounts
    .map((a) => `- ${a.platform}: @${a.username}`)
    .join("\n");
}
