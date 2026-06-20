import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/better-auth/auth";
import { prisma } from "@/lib/db/prisma";
import { appRouter } from "@/lib/constants/appRouter";
import Navbar from "@/components/dashboard/Navbar";
import TimezoneSync from "@/components/dashboard/TimezoneSync";
import LegacyKBBanner from "@/components/dashboard/LegacyKBBanner";
import PostHogIdentify from "@/components/tracking/PostHogIdentify";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerList = await headers();
  const session = await auth.api.getSession({
    headers: headerList,
  });

  if (!session?.user) {
    redirect("/");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboardingCompletedAt: true },
  });

  // The OAuth connect bridge (/d/accounts/callback) must stay reachable during
  // onboarding — it's where a freshly-connected account gets synced. Exempt it
  // from the onboarding redirect; everything else under /d requires completion.
  const pathname = headerList.get("x-pathname") ?? "";
  const isConnectCallback = pathname === appRouter.accountsCallback;

  if (!user?.onboardingCompletedAt && !isConnectCallback) {
    redirect("/onboarding");
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#faf9f5]">
      <PostHogIdentify userId={session.user.id} />
      <TimezoneSync />
      <Navbar />

      {/* Main content — min-w-0 + overflow-x-clip prevents wide content from
          causing horizontal page scroll. */}
      <main className="flex-1 min-w-0 bg-[#faf9f5] overflow-x-clip">
        <div className="px-4 md:px-8 py-6">
          <LegacyKBBanner />
          {children}
        </div>
      </main>
    </div>
  );
}
