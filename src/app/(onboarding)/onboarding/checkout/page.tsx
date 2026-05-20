import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/better-auth/auth";
import { prisma } from "@/lib/db/prisma";
import { CheckoutClient } from "./CheckoutClient";

interface SearchParams {
  cancelled?: string;
}

export default async function OnboardingCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) {
    redirect("/");
  }

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

  // Already subscribed — exit to dashboard
  if (
    subscription &&
    (subscription.status === "active" || subscription.status === "trialing")
  ) {
    redirect("/d");
  }

  // Missing earlier-step prerequisites — bounce back to onboarding
  if (
    !user?.knowledgeBase ||
    !user?.brandIdentity ||
    !lateProfile ||
    lateProfile.socialAccounts.length === 0
  ) {
    redirect("/onboarding");
  }

  const params = await searchParams;
  const cancelled = params.cancelled === "1";

  return <CheckoutClient cancelled={cancelled} />;
}
