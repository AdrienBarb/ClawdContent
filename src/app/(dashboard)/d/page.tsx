import { auth } from "@/lib/better-auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import EmptyDashboardShell from "@/components/dashboard/EmptyDashboardShell";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/");

  const lateProfile = await prisma.lateProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (lateProfile) {
    const firstAccount = await prisma.socialAccount.findFirst({
      where: { lateProfileId: lateProfile.id, status: "active" },
      orderBy: { createdAt: "asc" },
      select: { platform: true },
    });
    if (firstAccount) {
      redirect(`/d/${firstAccount.platform}`);
    }
  }

  return <EmptyDashboardShell />;
}
