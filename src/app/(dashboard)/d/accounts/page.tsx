"use client";

import { useState } from "react";
import { appRouter } from "@/lib/constants/appRouter";
import { getPlatform } from "@/lib/constants/platforms";
import useApi from "@/lib/hooks/useApi";
import { Skeleton } from "@/components/ui/skeleton";
import { Share2, Plus, X, Loader2, Lock, RefreshCw, Trash2 } from "lucide-react";
import ConnectAccountButtons from "@/components/dashboard/ConnectAccountButtons";
import SubscribeModal from "@/components/dashboard/SubscribeModal";
import UpgradeModal from "@/components/dashboard/UpgradeModal";
import toast from "react-hot-toast";

interface DashboardStatus {
  botStatus: string | null;
  subscription: { status: string; planId: string } | null;
  plan: { id: string; name: string; socialAccountLimit: number };
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
  const [reconnectingId, setReconnectingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

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

  const { mutate: removeAccountMutate } = usePost(
    appRouter.api.accountsRemove,
    {
      onSuccess: () => {
        setRemovingId(null);
        refetch();
      },
      onError: () => {
        setRemovingId(null);
        toast.error("Failed to remove account.");
      },
    }
  );

  const handleDisconnect = (accountId: string) => {
    setDisconnectingId(accountId);
    disconnectAccount({ accountId });
  };

  const handleRemove = (accountId: string) => {
    setRemovingId(accountId);
    removeAccountMutate({ accountId });
  };

  const { mutate: getConnectUrl } = usePost(appRouter.api.accountsConnect, {
    onSuccess: (data: { url: string }) => {
      const popup = window.open(
        data.url,
        "connect-account",
        "width=600,height=700"
      );
      const interval = setInterval(() => {
        if (popup?.closed) {
          clearInterval(interval);
          setReconnectingId(null);
          refetch();
        }
      }, 500);
    },
    onError: () => {
      toast.error("Failed to reconnect account. Please try again.");
      setReconnectingId(null);
    },
  });

  const handleReconnect = (accountId: string, platform: string) => {
    setReconnectingId(accountId);
    getConnectUrl({ platform });
  };

  const subStatus = status?.subscription?.status;
  const hasActiveSubscription =
    subStatus === "active" || subStatus === "trialing" || subStatus === "past_due";

  const accounts = status?.accounts ?? [];
  const activeCount = accounts.filter((a) => a.status === "active").length;
  const connectedPlatforms = accounts
    .filter((a) => a.status === "active")
    .map((a) => a.platform);
  const isBotReady = status?.botStatus === "running";
  const isDeploying =
    hasActiveSubscription && !isBotReady;
  const isDisabled = !hasActiveSubscription || !isBotReady;

  const plan = status?.plan;
  const accountLimit = plan?.socialAccountLimit ?? 2;
  const isAtLimit = activeCount >= accountLimit;

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

      {/* Account limit indicator */}
      {hasActiveSubscription && plan && (
        <div className="rounded-2xl border border-gray-100 bg-white p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-sm font-medium text-gray-900">
              {activeCount} / {accountLimit} accounts connected
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {plan.name} plan
              {isAtLimit && " — upgrade for more accounts"}
            </p>
          </div>
          <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                isAtLimit ? "bg-amber-400" : "bg-primary"
              }`}
              style={{
                width: `${Math.min((activeCount / accountLimit) * 100, 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Subscription gate banner */}
      {!hasActiveSubscription && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-center gap-3">
          <Lock className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-900">
              Subscribe to connect accounts
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              You need an active subscription to connect social media accounts.
            </p>
          </div>
          <button
            onClick={() => setShowSubscribeModal(true)}
            className="text-sm font-semibold text-primary hover:underline cursor-pointer shrink-0"
          >
            Subscribe
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
              const isReconnecting = reconnectingId === account.id;
              const isRemoving = removingId === account.id;
              const isDisconnected = account.status !== "active";
              return (
                <div
                  key={account.id}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white ${
                        isDisconnected ? "opacity-50" : ""
                      }`}
                      style={{
                        backgroundColor: platform?.color ?? "#6b7280",
                      }}
                    >
                      {platform?.icon ?? <Share2 className="h-4 w-4" />}
                    </span>
                    <div>
                      <span className={`text-sm font-medium ${isDisconnected ? "text-gray-400" : "text-gray-900"}`}>
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
                          : "bg-amber-400"
                      }`}
                    />
                    <span className={`text-xs capitalize ${isDisconnected ? "text-amber-500" : "text-gray-400"}`}>
                      {account.status}
                    </span>
                    {isDisconnected ? (
                      <>
                        <button
                          className="ml-1 flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-red-50 disabled:opacity-50 cursor-pointer"
                          onClick={() => handleReconnect(account.id, account.platform)}
                          disabled={isReconnecting || isRemoving}
                          title="Reconnect account"
                        >
                          {isReconnecting ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3 w-3" />
                          )}
                          Reconnect
                        </button>
                        <button
                          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50 cursor-pointer"
                          onClick={() => handleRemove(account.id)}
                          disabled={isRemoving || isReconnecting}
                          title="Remove account"
                        >
                          {isRemoving ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                          Remove
                        </button>
                      </>
                    ) : (
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
                    )}
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
          disabled={isDisabled || isAtLimit}
          onDisabledClick={
            !hasActiveSubscription
              ? () => setShowSubscribeModal(true)
              : isAtLimit
                ? () => setShowUpgradeModal(true)
                : undefined
          }
        />
        {isDeploying && hasActiveSubscription && (
          <p className="text-xs text-amber-500 mt-2">
            Available once your AI social media manager finishes deploying.
          </p>
        )}
        {!hasActiveSubscription && (
          <p className="text-xs text-amber-500 mt-2">
            Subscribe to connect social accounts.
          </p>
        )}
        {isAtLimit && hasActiveSubscription && (
          <p className="text-xs text-amber-500 mt-2">
            You&apos;ve reached your {plan?.name} plan limit.{" "}
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="text-primary font-medium hover:underline cursor-pointer"
            >
              Upgrade for more accounts
            </button>
          </p>
        )}
      </div>

      <SubscribeModal
        open={showSubscribeModal}
        onOpenChange={setShowSubscribeModal}
      />

      {plan && (
        <UpgradeModal
          open={showUpgradeModal}
          onOpenChange={setShowUpgradeModal}
          currentPlanName={plan.name}
          accountLimit={accountLimit}
        />
      )}
    </div>
  );
}
