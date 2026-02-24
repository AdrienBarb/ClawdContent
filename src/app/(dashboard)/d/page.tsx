import { auth } from "@/lib/better-auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { appRouter } from "@/lib/constants/appRouter";
import DashboardHome from "@/components/dashboard/DashboardHome";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/");

  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
  });

  if (!subscription || subscription.status === "incomplete") {
    redirect(appRouter.subscribe);
  }

  return <DashboardHome userName={session.user.name || "there"} />;
}
