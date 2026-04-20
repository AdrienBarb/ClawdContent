import { auth } from "@/lib/better-auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import ChatWithLoader from "@/components/dashboard/ChatWithLoader";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/");

  return <ChatWithLoader />;
}
