import { auth } from "@/lib/better-auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import ChannelPage from "@/components/dashboard/ChannelPage";

export default async function ChannelRoute({
  params,
}: {
  params: Promise<{ channelId: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/");

  const { channelId } = await params;

  return <ChannelPage channelId={channelId} />;
}
