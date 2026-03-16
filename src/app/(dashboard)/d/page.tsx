import { auth } from "@/lib/better-auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import DashboardFlow from "@/components/dashboard/DashboardFlow";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/");

  const [subscription, flyMachine] = await Promise.all([
    prisma.subscription.findUnique({
      where: { userId: session.user.id },
    }),
    prisma.flyMachine.findUnique({
      where: { userId: session.user.id },
    }),
  ]);

  const hasActiveSubscription =
    subscription?.status === "active" ||
    subscription?.status === "trialing" ||
    subscription?.status === "past_due";

  return (
    <DashboardFlow
      initialHasSubscription={hasActiveSubscription}
      initialHasFlyMachine={!!flyMachine}
    />
  );
}
