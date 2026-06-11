import { auth } from "@/lib/better-auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import WeekPage from "@/components/dashboard/week/WeekPage";

export const metadata = { title: "My week" };

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/");

  return <WeekPage />;
}
