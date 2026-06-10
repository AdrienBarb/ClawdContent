import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/better-auth/auth";
import { prisma } from "@/lib/db/prisma";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/");
  }

  // Onboarding is complete once the subscription has started (onboardingCompletedAt).
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboardingCompletedAt: true },
  });

  if (user?.onboardingCompletedAt) {
    redirect("/d");
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#faf9f5] px-0 py-0 sm:px-4 sm:py-8">
      {children}
    </div>
  );
}
