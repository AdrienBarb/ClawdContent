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

  // Only kick the user to /d if EVERY onboarding step is complete:
  // knowledge base + brand identity + ≥1 active social account + active
  // (or trialing) Stripe subscription. Anything less and we keep the user
  // inside (onboarding) so they can finish — including the new
  // /onboarding/checkout step.
  const [user, subscription, lateProfile] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { knowledgeBase: true, brandIdentity: true },
    }),
    prisma.subscription.findUnique({ where: { userId: session.user.id } }),
    prisma.lateProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        socialAccounts: { where: { status: "active" }, select: { id: true } },
      },
    }),
  ]);

  const onboardingCompleted =
    !!user?.knowledgeBase &&
    !!user?.brandIdentity &&
    (lateProfile?.socialAccounts?.length ?? 0) >= 1 &&
    !!subscription &&
    (subscription.status === "active" || subscription.status === "trialing");

  if (onboardingCompleted) {
    redirect("/d");
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
    </div>
  );
}
