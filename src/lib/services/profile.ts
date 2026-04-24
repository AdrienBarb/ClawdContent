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

export function formatUserContext(user: {
  knowledgeBase: unknown;
}): string {
  if (!user.knowledgeBase || typeof user.knowledgeBase !== "object") {
    return "No business profile provided yet.";
  }

  const kb = user.knowledgeBase as Record<string, unknown>;

  // Legacy users who were backfilled with { source: "legacy" } only
  if (kb.source === "legacy" && !kb.businessName) {
    return "No business profile provided yet.";
  }

  const parts: string[] = [];

  if (typeof kb.businessName === "string") parts.push(`Business: ${kb.businessName}`);
  if (typeof kb.description === "string") parts.push(`Description: ${kb.description}`);
  if (Array.isArray(kb.services) && kb.services.length > 0) {
    parts.push(`Services: ${kb.services.join(", ")}`);
  }

  return parts.length > 0
    ? parts.join("\n")
    : "No business profile provided yet.";
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
