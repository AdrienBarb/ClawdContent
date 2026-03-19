import { auth } from "@/lib/better-auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import PostsQueue from "@/components/dashboard/PostsQueue";

export default async function QueuePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { timezone: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Queue
        </h1>
        <p className="text-gray-500 mt-1">
          Manage posts scheduled by your AI assistant. Cancel, reschedule, or
          clean up anything that needs fixing.
        </p>
      </div>
      <PostsQueue timezone={user?.timezone ?? null} />
    </div>
  );
}
