import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/better-auth/auth";
import { prisma } from "@/lib/db/prisma";
import Sidebar, {
  MobileSidebarTrigger,
} from "@/components/dashboard/Sidebar";
import TimezoneSync from "@/components/dashboard/TimezoneSync";

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
    <div className="flex min-h-screen bg-[#f3f3f1]">
      <TimezoneSync />
      <Sidebar />

      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* Mobile header */}
        <div className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-white px-4 md:hidden">
          <MobileSidebarTrigger />
          <span className="text-sm font-semibold">PostClaw</span>
        </div>

        {/* Main content — white panel floating over tinted background */}
        <main className="flex-1 bg-white md:rounded-2xl md:border md:border-gray-200/80 md:m-2 md:ml-0">
          <div className="px-8 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
