import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/better-auth/auth";
import { prisma } from "@/lib/db/prisma";
import Sidebar, {
  MobileSidebarTrigger,
} from "@/components/dashboard/Sidebar";
import TimezoneSync from "@/components/dashboard/TimezoneSync";
import LegacyKBBanner from "@/components/dashboard/LegacyKBBanner";

export default async function DashboardLayout({
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

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { knowledgeBase: true },
  });

  if (user?.knowledgeBase === null) {
    redirect("/onboarding");
  }

  return (
    <div className="flex min-h-screen bg-[#faf9f5]">
      <TimezoneSync />
      <Sidebar />

      <div className="flex-1 min-w-0 md:ml-64 flex flex-col min-h-screen">
        {/* Mobile header */}
        <div className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-gray-200 bg-[#faf9f5] px-4 md:hidden">
          <MobileSidebarTrigger />
          <span className="text-sm font-semibold">PostClaw</span>
        </div>

        {/* Main content — flat, flush with sidebar.
            min-w-0 + overflow-x-clip prevents wide content from causing horizontal page scroll. */}
        <main className="flex-1 min-w-0 bg-[#faf9f5] overflow-x-clip">
          <div className="px-8 py-6">
            <LegacyKBBanner />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
