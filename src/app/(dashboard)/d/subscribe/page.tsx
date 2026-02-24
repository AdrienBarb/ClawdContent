import { auth } from "@/lib/better-auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { appRouter } from "@/lib/constants/appRouter";
import SubscribeCard from "./SubscribeCard";

export default async function SubscribePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/");

  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
  });

  if (subscription && subscription.status === "active") {
    redirect(appRouter.dashboard);
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <SubscribeCard />
    </div>
  );
}
