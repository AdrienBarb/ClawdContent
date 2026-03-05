"use client";

import { useState } from "react";
import { appRouter } from "@/lib/constants/appRouter";
import { getPlatform } from "@/lib/constants/platforms";
import useApi from "@/lib/hooks/useApi";
import { Skeleton } from "@/components/ui/skeleton";
import { Share2, Plus, X, Loader2, Lock } from "lucide-react";
import ConnectAccountButtons from "@/components/dashboard/ConnectAccountButtons";
import SubscribeModal from "@/components/dashboard/SubscribeModal";
import toast from "react-hot-toast";

interface DashboardStatus {
  botStatus: string | null;
  subscription: { status: string } | null;
  accounts: Array<{
    id: string;
    platform: string;
    username: string;
    status: string;
  }>;
}

export default function AccountsPage() {
  const { useGet, usePost } = useApi();
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);

  const {
    data: status,
    isLoading,
    refetch,
  } = useGet(appRouter.api.dashboardStatus, undefined, {
    refetchInterval: 5000,
  }) as {
    data: DashboardStatus | undefined;
    isLoading: boolean;
    refetch: () => void;
  };

  const { mutate: disconnectAccount } = usePost(
    appRouter.api.accountsDisconnect,
    {
      onSuccess: () => {
        setDisconnectingId(null);
        refetch();
      },
      onError: () => {
        setDisconnectingId(null);
        toast.error("Failed to disconnect account.");
      },
    }
  );

  const handleDisconnect = (accountId: string) => {
    setDisconnectingId(accountId);
    disconnectAccount({ accountId });
  };

  const subStatus = status?.subscription?.status;
  const hasActiveSubscription =
    subStatus === "active" || subStatus === "trialing" || subStatus === "past_due";

  const accounts = status?.accounts ?? [];
  const activeCount = accounts.filter((a) => a.status === "active").length;
  const connectedPlatforms = accounts
    .filter((a) => a.status === "active")
    .map((a) => a.platform);
  const isDeploying =
    status?.botStatus === "deploying" || status?.botStatus === "pending";
  const isDisabled = !hasActiveSubscription || isDeploying;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

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

      {/* Subscription gate banner */}
      {!hasActiveSubscription && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-center gap-3">
          <Lock className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-900">
              Launch your bot to connect accounts
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              You need an active subscription to connect social media accounts.
            </p>
          </div>
          <button
            onClick={() => setShowSubscribeModal(true)}
            className="text-sm font-semibold text-[#e8614d] hover:underline cursor-pointer shrink-0"
          >
            Launch bot
          </button>
        </div>
      )}

      {/* Connected accounts */}
      {accounts.length > 0 ? (
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
            Connected ({activeCount} active)
          </p>
          <div className="divide-y divide-gray-50">
            {accounts.map((account) => {
              const platform = getPlatform(account.platform);
              const isDisconnecting = disconnectingId === account.id;
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
                    <button
                      className="ml-1 rounded-md p-1 text-gray-300 transition-colors hover:bg-gray-100 hover:text-gray-500 disabled:opacity-50 cursor-pointer"
                      onClick={() => handleDisconnect(account.id)}
                      disabled={isDisconnecting}
                      title="Disconnect account"
                    >
                      {isDisconnecting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <X className="h-3.5 w-3.5" />
                      )}
                    </button>
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
        <ConnectAccountButtons
          onAccountConnected={refetch}
          connectedPlatforms={connectedPlatforms}
          disabled={isDisabled}
          onDisabledClick={
            !hasActiveSubscription
              ? () => setShowSubscribeModal(true)
              : undefined
          }
        />
        {isDeploying && hasActiveSubscription && (
          <p className="text-xs text-amber-500 mt-2">
            Available once your bot finishes deploying.
          </p>
        )}
        {!hasActiveSubscription && (
          <p className="text-xs text-amber-500 mt-2">
            Launch your bot to connect social accounts.
          </p>
        )}
      </div>

      <SubscribeModal
        open={showSubscribeModal}
        onOpenChange={setShowSubscribeModal}
      />
    </div>
  );
}
