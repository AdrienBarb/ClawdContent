import { prisma } from "@/lib/db/prisma";

interface OnboardingData {
  telegramBotToken: string;
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
      telegramBotToken: data.telegramBotToken,
      onboardingRole: data.role ?? null,
      onboardingNiche: data.niche ?? null,
      onboardingTopics: data.topics ?? [],
    },
  });
}
