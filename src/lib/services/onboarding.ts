import { prisma } from "@/lib/db/prisma";
import { generateAndStoreSuggestions } from "@/lib/services/suggestions";

interface OnboardingData {
  role?: string;
  niche?: string;
  topics?: string[];
  goal?: string;
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
      onboardingGoal: data.goal ?? null,
    },
  });

  // Generate personalized chat suggestions (non-blocking)
  if (data.role || data.niche || data.goal || (data.topics && data.topics.length > 0)) {
    generateAndStoreSuggestions(
      userId,
      data.role ?? null,
      data.niche ?? null,
      data.topics ?? [],
      data.goal ?? null
    ).catch((err) =>
      console.error(`Failed to generate suggestions for user ${userId}:`, err)
    );
  }
}
