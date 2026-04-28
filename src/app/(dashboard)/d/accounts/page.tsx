"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { appRouter } from "@/lib/constants/appRouter";
import { getPlatform } from "@/lib/constants/platforms";
import useApi from "@/lib/hooks/useApi";
import { useDashboardStatus } from "@/lib/hooks/useDashboardStatus";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShareNetworkIcon,
  PlusIcon,
  XIcon,
  SpinnerGapIcon,
  ArrowsClockwiseIcon,
  TrashIcon,
  ShieldCheckIcon,
  LockKeyIcon,
  SignOutIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import ConnectAccountButtons from "@/components/dashboard/ConnectAccountButtons";
import PageHeader from "@/components/dashboard/PageHeader";
import toast from "react-hot-toast";

// Modals only mount on user click — defer their JS.
const SubscribeModal = dynamic(
  () => import("@/components/dashboard/SubscribeModal"),
  { ssr: false }
);
const UpgradeModal = dynamic(
  () => import("@/components/dashboard/UpgradeModal"),
  { ssr: false }
);

interface DashboardStatus {
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
  const { usePost } = useApi();
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [reconnectingId, setReconnectingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const {
    data: status,
    isLoading,
    refetch,
  } = useDashboardStatus() as {
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

  const handleDisconnect = (accountId: string) => {
    setDisconnectingId(accountId);
    disconnectAccount({ accountId });
  };

  const handleRemove = (accountId: string) => {
    setRemovingId(accountId);
    removeAccountMutate({ accountId });
  };

  const handleReconnect = (accountId: string, platform: string) => {
    setReconnectingId(accountId);
    getConnectUrl({ platform });
  };

  const subStatus = status?.subscription?.status;
  const hasActiveSubscription =
    subStatus === "active" ||
    subStatus === "trialing" ||
    subStatus === "past_due";

  const accounts = status?.accounts ?? [];
  const activeCount = accounts.filter((a) => a.status === "active").length;
  const connectedPlatforms = accounts
    .filter((a) => a.status === "active")
    .map((a) => a.platform);
  const plan = status?.plan;
  const accountLimit = plan?.socialAccountLimit ?? 2;
  const isAtLimit = activeCount >= accountLimit;
  const isEmptyState = accounts.length === 0;
  const usagePct = Math.min((activeCount / accountLimit) * 100, 100);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-56 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Social accounts"
        subtitle="The accounts PostClaw posts to on your behalf."
      />

      {accounts.length > 0 && (
        <section className="rounded-2xl bg-white border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between gap-4 px-5 pt-5 pb-3">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-gray-400">
              Connected
            </p>
            {hasActiveSubscription && plan ? (
              <div className="flex items-center gap-2.5">
                <span className="text-[11px] text-gray-500 tabular-nums">
                  {activeCount} / {accountLimit} on {plan.name}
                </span>
                <div className="h-1 w-16 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isAtLimit ? "bg-amber-400" : "bg-primary"
                    }`}
                    style={{ width: `${usagePct}%` }}
                  />
                </div>
              </div>
            ) : (
              <span className="text-[11px] text-gray-500 tabular-nums">
                {activeCount} active
              </span>
            )}
          </div>
          <ul className="px-2 pb-2">
            {accounts.map((account) => {
              const platform = getPlatform(account.platform);
              const isDisconnecting = disconnectingId === account.id;
              const isReconnecting = reconnectingId === account.id;
              const isRemoving = removingId === account.id;
              const isDisconnected = account.status !== "active";
              return (
                <li
                  key={account.id}
                  className="relative flex items-center justify-between gap-3 rounded-xl py-2.5 pl-5 pr-2 transition-colors hover:bg-black/[0.035]"
                >
                  <span
                    aria-hidden
                    className="absolute left-2 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-full"
                    style={{
                      backgroundColor: platform?.color ?? "#9ca3af",
                      opacity: isDisconnected ? 0.35 : 1,
                    }}
                  />
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] text-white"
                      style={{
                        backgroundColor: platform?.color ?? "#6b7280",
                        opacity: isDisconnected ? 0.5 : 1,
                      }}
                    >
                      {platform?.icon ?? (
                        <ShareNetworkIcon className="h-3.5 w-3.5" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p
                        className={`truncate text-[13px] font-medium ${
                          isDisconnected ? "text-gray-400" : "text-gray-900"
                        }`}
                      >
                        @{account.username}
                      </p>
                      <p className="truncate text-[11px] text-gray-500">
                        {platform?.label ?? account.platform}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {isDisconnected ? (
                      <>
                        <span className="mr-1 hidden items-center gap-1.5 text-[11px] text-amber-600 sm:flex">
                          <WarningCircleIcon
                            className="h-3.5 w-3.5"
                            weight="fill"
                          />
                          Needs reconnect
                        </span>
                        <button
                          className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-medium text-gray-700 transition-colors hover:bg-black/[0.05] disabled:opacity-50"
                          onClick={() =>
                            handleReconnect(account.id, account.platform)
                          }
                          disabled={isReconnecting || isRemoving}
                          title="Reconnect account"
                        >
                          {isReconnecting ? (
                            <SpinnerGapIcon className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <ArrowsClockwiseIcon className="h-3.5 w-3.5" />
                          )}
                          Reconnect
                        </button>
                        <button
                          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-[#fef2f0] hover:text-[#c84a35] disabled:opacity-50"
                          onClick={() => handleRemove(account.id)}
                          disabled={isRemoving || isReconnecting}
                          title="Remove account"
                        >
                          {isRemoving ? (
                            <SpinnerGapIcon className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <TrashIcon className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </>
                    ) : (
                      <button
                        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-black/[0.05] hover:text-gray-700 disabled:opacity-50"
                        onClick={() => handleDisconnect(account.id)}
                        disabled={isDisconnecting}
                        title="Disconnect account"
                      >
                        {isDisconnecting ? (
                          <SpinnerGapIcon className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <XIcon className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {isEmptyState ? (
        <section
          id="connect-section"
          className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm sm:p-10"
        >
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheckIcon className="h-6 w-6" weight="duotone" />
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-gray-900">
              Connect your first account
            </h2>
            <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-gray-500">
              You stay in control — nothing gets posted unless you ask for it.
            </p>
          </div>
          <ConnectAccountButtons
            onAccountConnected={refetch}
            connectedPlatforms={connectedPlatforms}
          />
          <div className="mt-6 flex items-center justify-center gap-3 text-[11px] text-gray-400">
            <span className="flex items-center gap-1.5">
              <LockKeyIcon className="h-3.5 w-3.5" />
              Secure connection
            </span>
            <span className="text-gray-200">·</span>
            <span className="flex items-center gap-1.5">
              <SignOutIcon className="h-3.5 w-3.5" />
              Disconnect anytime
            </span>
          </div>
        </section>
      ) : (
        <section
          id="connect-section"
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
        >
          <div className="mb-4 flex items-center gap-2">
            <PlusIcon className="h-3.5 w-3.5 text-gray-400" />
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-gray-400">
              Add another platform
            </p>
          </div>
          <ConnectAccountButtons
            onAccountConnected={refetch}
            connectedPlatforms={connectedPlatforms}
            disabled={isAtLimit}
            onDisabledClick={
              isAtLimit
                ? () =>
                    hasActiveSubscription
                      ? setShowUpgradeModal(true)
                      : setShowSubscribeModal(true)
                : undefined
            }
          />
          {isAtLimit && (
            <p className="mt-3 text-[12px] text-amber-600">
              {hasActiveSubscription ? (
                <>
                  You&apos;ve reached your {plan?.name} plan limit.{" "}
                  <button
                    onClick={() => setShowUpgradeModal(true)}
                    className="cursor-pointer font-medium text-primary hover:underline"
                  >
                    Upgrade for more accounts
                  </button>
                </>
              ) : (
                <>
                  Connect more accounts by subscribing.{" "}
                  <button
                    onClick={() => setShowSubscribeModal(true)}
                    className="cursor-pointer font-medium text-primary hover:underline"
                  >
                    Choose a plan
                  </button>
                </>
              )}
            </p>
          )}
        </section>
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
