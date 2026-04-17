"use client";

import { useState } from "react";
import { appRouter } from "@/lib/constants/appRouter";
import { getPlatform } from "@/lib/constants/platforms";
import useApi from "@/lib/hooks/useApi";
import { Skeleton } from "@/components/ui/skeleton";
import { ShareNetworkIcon, PlusIcon, XIcon, CircleNotchIcon, LockIcon, ArrowsClockwiseIcon, TrashIcon } from "@phosphor-icons/react";
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

  const showGlassPreview = !hasActiveSubscription;

  return (
    <div className={showGlassPreview ? "relative min-h-[calc(100vh-8rem)]" : "space-y-8"}>
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
                      {platform?.icon ?? <ShareNetworkIcon className="h-4 w-4" />}
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
                            <CircleNotchIcon className="h-3 w-3 animate-spin" />
                          ) : (
                            <ArrowsClockwiseIcon className="h-3 w-3" />
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
                            <CircleNotchIcon className="h-3 w-3 animate-spin" />
                          ) : (
                            <TrashIcon className="h-3 w-3" />
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
                          <CircleNotchIcon className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <XIcon className="h-3.5 w-3.5" />
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
        <></>
      )}

      {showGlassPreview ? (
        <div className="absolute inset-0 mt-24">
          {/* Blurred fake data */}
          <div className="blur-[1.5px] pointer-events-none select-none space-y-8 px-6 max-w-5xl mx-auto" style={{ maskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black 30%, transparent 80%)", WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black 30%, transparent 80%)" }}>
            <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
                Connected (3 active)
              </p>
              <div className="divide-y divide-gray-50">
                {[
                  { platform: "twitter", username: "yourhandle" },
                  { platform: "linkedin", username: "your-company" },
                  { platform: "instagram", username: "your.brand" },
                  { platform: "tiktok", username: "yourbrand" },
                  { platform: "facebook", username: "Your Page" },
                ].map((item, idx) => {
                  const platform = getPlatform(item.platform);
                  return (
                    <div key={idx} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white" style={{ backgroundColor: platform?.color ?? "#6b7280" }}>
                          {platform?.icon ?? <ShareNetworkIcon className="h-4 w-4" />}
                        </span>
                        <div>
                          <span className="text-sm font-medium text-gray-900">{platform?.label ?? item.platform}</span>
                          <p className="text-xs text-gray-500">@{item.username}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400" />
                        <span className="text-xs text-gray-400">active</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <PlusIcon className="h-4 w-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900">Connect a platform</h3>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {["twitter", "linkedin", "bluesky", "threads", "instagram", "facebook", "tiktok", "youtube", "pinterest"].map((id) => {
                  const p = getPlatform(id);
                  return (
                    <div key={id} className="flex items-center gap-3 rounded-xl border border-gray-100 px-4 py-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white" style={{ backgroundColor: p?.color ?? "#6b7280" }}>
                        {p?.icon}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{p?.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Overlay — centered in viewport */}
          <div className="fixed inset-0 z-10 flex items-center justify-center pointer-events-none md:pl-64">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200/60 px-8 py-8 max-w-md w-full text-center pointer-events-auto">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--sidebar-accent)] mb-3">
                Get started
              </p>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Manage all your socials in one place
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-5">
                Connect your profiles and let your AI manager handle the rest.
              </p>

              <div className="flex flex-col gap-2.5 mb-6 text-left">
                <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--sidebar-accent)]/10 text-[var(--sidebar-accent)]">
                    <ShareNetworkIcon weight="bold" className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">13+ platforms supported</p>
                    <p className="text-xs text-gray-500">X, LinkedIn, Instagram, TikTok, and more</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--sidebar-accent)]/10 text-[var(--sidebar-accent)]">
                    <LockIcon weight="bold" className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Secure OAuth connection</p>
                    <p className="text-xs text-gray-500">We never store your passwords</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--sidebar-accent)]/10 text-[var(--sidebar-accent)]">
                    <CircleNotchIcon weight="bold" className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">AI publishes for you</p>
                    <p className="text-xs text-gray-500">Your manager posts directly to your accounts</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowSubscribeModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--sidebar-accent)] px-6 py-3 text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-lg cursor-pointer w-full justify-center"
              >
                Get started
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div id="connect-section" className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <PlusIcon className="h-4 w-4 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-900">Connect a platform</h3>
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
            {isAtLimit && hasActiveSubscription && (
              <p className="text-xs text-amber-500 mt-2">
                You&apos;ve reached your {plan?.name} plan limit.{" "}
                <button onClick={() => setShowUpgradeModal(true)} className="text-primary font-medium hover:underline cursor-pointer">
                  Upgrade for more accounts
                </button>
              </p>
            )}
          </div>
        </>
      )}

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
