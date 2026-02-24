"use client";

import { useState } from "react";
import { appRouter } from "@/lib/constants/appRouter";
import { getPlatform } from "@/lib/constants/platforms";
import useApi from "@/lib/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bot,
  Share2,
  RefreshCw,
  Plus,
  MessageCircle,
  Loader2,
} from "lucide-react";
import TelegramTokenModal from "@/components/dashboard/TelegramTokenModal";
import ConnectAccountButtons from "@/components/dashboard/ConnectAccountButtons";

interface DashboardStatus {
  subscription: {
    status: string;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: string | null;
  } | null;
  botStatus: string | null;
  hasTelegramToken: boolean;
  accountCount: number;
  accounts: Array<{
    id: string;
    platform: string;
    username: string;
    status: string;
  }>;
}

function StatusDot({
  status,
  size = "sm",
}: {
  status: string | null;
  size?: "sm" | "md";
}) {
  const color =
    status === "running"
      ? "bg-emerald-400"
      : status === "deploying"
        ? "bg-amber-400 animate-pulse"
        : status === "failed"
          ? "bg-red-400"
          : status === "stopped"
            ? "bg-gray-400"
            : "bg-gray-300 animate-pulse";

  const sizeClass = size === "md" ? "h-3 w-3" : "h-2.5 w-2.5";

  return <span className={`inline-block rounded-full ${sizeClass} ${color}`} />;
}

function StatusLabel({ status }: { status: string | null }) {
  const labels: Record<string, string> = {
    running: "Running",
    deploying: "Deploying...",
    failed: "Failed",
    stopped: "Stopped",
    pending: "Pending",
  };
  return (
    <span className="text-sm font-medium capitalize">
      {status ? labels[status] || status : "Provisioning..."}
    </span>
  );
}

export default function DashboardHome({ userName }: { userName: string }) {
  const { useGet, usePost, usePatch } = useApi();
  const [telegramModalOpen, setTelegramModalOpen] = useState(false);

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

  const { mutate: retryProvisioning, isPending: retrying } = usePost(
    appRouter.api.provisioningRetry,
    { onSuccess: () => refetch() }
  );

  const { mutate: restartBot, isPending: restarting } = usePatch(
    appRouter.api.bot,
    { onSuccess: () => refetch() }
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-56 mb-2" />
        <div className="grid gap-5 md:grid-cols-2">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Welcome back, {userName}
        </h1>
        <p className="text-gray-500 mt-1">
          Here&apos;s an overview of your PostClaw setup.
        </p>
      </div>

      {/* Status cards */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* Bot status card */}
        <div
          className="rounded-2xl p-5 text-white shadow-md"
          style={{
            background: "linear-gradient(135deg, #151929 0%, #252b4a 100%)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Bot Status
            </span>
            <Bot className="h-5 w-5 text-gray-400" />
          </div>
          <div className="flex items-center gap-2.5 mb-1">
            <StatusDot status={status?.botStatus ?? null} size="md" />
            <span className="text-lg font-semibold">
              <StatusLabel status={status?.botStatus ?? null} />
            </span>
          </div>
          <p className="text-sm text-gray-400 mb-4">
            Your PostClaw bot container
          </p>
          <div className="flex gap-2">
            {(status?.botStatus === "failed" || status?.botStatus === null) && (
              <Button
                size="sm"
                className="bg-red-500 hover:bg-red-600 text-white border-0"
                onClick={() => retryProvisioning({})}
                disabled={retrying}
              >
                {retrying ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                )}
                Retry
              </Button>
            )}
            {status?.botStatus === "running" && (
              <Button
                size="sm"
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-white/10 hover:text-white bg-transparent"
                onClick={() => restartBot({})}
                disabled={restarting}
              >
                {restarting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                )}
                Restart
              </Button>
            )}
          </div>
        </div>

        {/* Telegram card */}
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Telegram
            </span>
            <MessageCircle className="h-5 w-5 text-gray-400" />
          </div>
          {status?.hasTelegramToken ? (
            <>
              <div className="flex items-center gap-2.5 mb-1">
                <StatusDot status="running" size="md" />
                <span className="text-lg font-semibold text-gray-900">
                  Connected
                </span>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Your Telegram bot is linked
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setTelegramModalOpen(true)}
              >
                Update token
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-4">
                Connect your Telegram bot to start chatting with your AI content
                manager.
              </p>
              <Button
                size="sm"
                className="bg-[#e8614d] hover:bg-[#d4563f] text-white"
                onClick={() => setTelegramModalOpen(true)}
              >
                <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                Configure Telegram
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Social accounts section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2.5">
          <Share2 className="h-4 w-4 text-gray-400" />
          <h2 className="text-lg font-semibold tracking-tight text-gray-900">
            Social Accounts
          </h2>
          {status?.accountCount ? (
            <span className="text-xs font-medium bg-[#e8614d] text-white px-2 py-0.5 rounded-full">
              {status.accountCount}
            </span>
          ) : null}
        </div>

        {status?.accounts && status.accounts.length > 0 ? (
          <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
            <div className="divide-y divide-gray-50">
              {status.accounts.map((account) => {
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
                        {platform?.icon ?? (
                          <Share2 className="h-4 w-4" />
                        )}
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
                      <StatusDot
                        status={
                          account.status === "active" ? "running" : "stopped"
                        }
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

        <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <Plus className="h-4 w-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900">
              Connect a platform
            </h3>
          </div>
          <ConnectAccountButtons onAccountConnected={refetch} />
        </div>
      </div>

      <TelegramTokenModal
        open={telegramModalOpen}
        onOpenChange={setTelegramModalOpen}
        onSuccess={refetch}
      />
    </div>
  );
}
