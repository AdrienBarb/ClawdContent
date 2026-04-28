import { auth } from "@/lib/better-auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy-load — recharts (~180 KB) is heavy and only matters on this route.
const AnalyticsDashboard = dynamic(
  () => import("@/components/dashboard/AnalyticsDashboard"),
  {
    loading: () => (
      <div className="space-y-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    ),
  }
);

export default async function AnalyticsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/");

  return <AnalyticsDashboard />;
}
