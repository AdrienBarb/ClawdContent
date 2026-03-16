import { auth } from "@/lib/better-auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import PostsList from "@/components/dashboard/PostsList";

export default async function PostsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Posts
        </h1>
        <p className="text-gray-500 mt-1">
          View and manage posts created through your AI assistant.
        </p>
      </div>
      <PostsList />
    </div>
  );
}
