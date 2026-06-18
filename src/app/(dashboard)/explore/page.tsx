import { auth } from "@/lib/better-auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import ExploreScreen from "@/components/dashboard/explore/ExploreScreen";

export const metadata = { title: "Create" };

export default async function ExploreRoutePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/");

  return <ExploreScreen />;
}
