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

const ROLE_LABELS: Record<string, string> = {
  solopreneur: "Solopreneur / Indie Maker",
  startup_founder: "Startup Founder",
  freelancer: "Freelancer / Consultant",
  content_creator: "Content Creator",
  marketing_manager: "Marketing Manager",
};

const GOAL_LABELS: Record<string, string> = {
  get_clients: "Get clients / Generate leads",
  personal_brand: "Build personal brand",
  product_awareness: "Grow product awareness",
  community: "Build & engage a community",
  visibility: "Stay visible without spending hours",
};

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
  if (user.onboardingGoal) {
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
