import { Suspense } from "react";
import { auth } from "@/lib/better-auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { Skeleton } from "@/components/ui/skeleton";
import { Share2, Plus } from "lucide-react";
import { getPlatform } from "@/lib/constants/platforms";
import ConnectAccountButtons from "@/components/dashboard/ConnectAccountButtons";

async function AccountsContent() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/");

  const lateProfile = await prisma.lateProfile.findUnique({
    where: { userId: session.user.id },
    include: { socialAccounts: { orderBy: { createdAt: "desc" } } },
  });

  const accounts = lateProfile?.socialAccounts ?? [];
  const activeCount = accounts.filter((a) => a.status === "active").length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Social Accounts
        </h1>
        <p className="text-gray-500 mt-1">
          Manage your connected social media accounts.
        </p>
      </div>

      {/* Connected accounts */}
      {accounts.length > 0 ? (
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
            Connected ({activeCount} active)
          </p>
          <div className="divide-y divide-gray-50">
            {accounts.map((account) => {
              const platform = getPlatform(account.platform);
              return (
                <div
                  key={account.id}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
                      style={{
                        backgroundColor: platform?.color ?? "#6b7280",
                      }}
                    >
                      {platform?.icon ?? <Share2 className="h-4 w-4" />}
                    </span>
                    <div>
                      <span className="text-sm font-medium text-gray-900">
                        {platform?.label ?? account.platform}
                      </span>
                      <p className="text-xs text-gray-500">
                        @{account.username}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block h-2.5 w-2.5 rounded-full ${
                        account.status === "active"
                          ? "bg-emerald-400"
                          : "bg-gray-300"
                      }`}
                    />
                    <span className="text-xs text-gray-400 capitalize">
                      {account.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white/50 p-10 text-center">
          <Share2 className="h-8 w-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500 mb-1">
            No accounts connected yet
          </p>
          <p className="text-xs text-gray-400">
            Connect your social accounts to start posting content.
          </p>
        </div>
      )}

      {/* Connect new */}
      <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="h-4 w-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900">
            Connect a platform
          </h3>
        </div>
        <ConnectAccountButtons />
      </div>
    </div>
  );
}

export default function AccountsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      }
    >
      <AccountsContent />
    </Suspense>
  );
}
