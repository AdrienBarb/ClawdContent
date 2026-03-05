import { auth } from "@/lib/better-auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import ChatWithLoader from "@/components/dashboard/ChatWithLoader";
import DashboardUnsubscribed from "@/components/dashboard/DashboardUnsubscribed";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/");

  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
  });

  const hasActiveSubscription =
    subscription?.status === "active" ||
    subscription?.status === "trialing" ||
    subscription?.status === "past_due";

  if (!hasActiveSubscription) {
    return <DashboardUnsubscribed />;
  }

  return <ChatWithLoader />;
}
