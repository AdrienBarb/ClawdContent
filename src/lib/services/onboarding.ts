import { prisma } from "@/lib/db/prisma";
import { generateAndStoreSuggestions } from "@/lib/services/suggestions";

interface OnboardingData {
  role?: string;
  niche?: string;
  topics?: string[];
}

export async function completeOnboarding(
  userId: string,
  data: OnboardingData
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      onboardingCompleted: true,
      onboardingRole: data.role ?? null,
      onboardingNiche: data.niche ?? null,
      onboardingTopics: data.topics ?? [],
    },
  });

  // Generate personalized chat suggestions (non-blocking)
  if (data.role || data.niche || (data.topics && data.topics.length > 0)) {
    generateAndStoreSuggestions(
      userId,
      data.role ?? null,
      data.niche ?? null,
      data.topics ?? []
    ).catch((err) =>
      console.error(`Failed to generate suggestions for user ${userId}:`, err)
    );
  }
}
