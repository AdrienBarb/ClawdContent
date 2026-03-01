import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/better-auth/auth";
import { prisma } from "@/lib/db/prisma";
import Sidebar, {
  MobileSidebarTrigger,
} from "@/components/dashboard/Sidebar";
import SubscribeModal from "@/components/dashboard/SubscribeModal";

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

  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
  });

  const hasActiveSubscription =
    subscription?.status === "active" ||
    subscription?.status === "trialing" ||
    subscription?.status === "past_due";

  if (!hasActiveSubscription) {
    return <SubscribeModal />;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* Mobile header */}
        <div className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-white px-4 md:hidden">
          <MobileSidebarTrigger />
          <span className="text-sm font-semibold">PostClaw</span>
        </div>

        {/* Main content */}
        <main className="flex-1 bg-[#f8f9fc]">
          <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
