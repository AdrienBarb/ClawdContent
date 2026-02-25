"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
  X,
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
} from "lucide-react";
import TelegramTokenModal from "@/components/dashboard/TelegramTokenModal";
import ConnectAccountButtons from "@/components/dashboard/ConnectAccountButtons";
import toast from "react-hot-toast";

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

const EXAMPLE_PROMPTS = [
  "Write a LinkedIn post about my latest project",
  "Turn this idea into a Twitter thread",
  "Draft a short announcement for Threads",
  "Adapt my last post for Bluesky",
  "Write a professional update about a milestone",
  "Rewrite this in a more casual tone for Twitter",
];

declare global {
  interface Window {
    twq?: (...args: unknown[]) => void;
    rdt?: (...args: unknown[]) => void;
  }
}

export default function DashboardHome({ userName }: { userName: string }) {
  const { useGet, usePost, usePatch } = useApi();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [telegramModalOpen, setTelegramModalOpen] = useState(false);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);

  // Conversion tracking on successful payment
  useEffect(() => {
    if (searchParams.get("payment") === "success") {
      window.twq?.("event", "tw-r6zft-r6zfu", {});
      window.rdt?.("track", "Purchase");
      router.replace("/d", { scroll: false });
    }
  }, [searchParams, router]);

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
    {
      onSuccess: () => {
        toast.success("Bot is restarting...");
        refetch();
      },
      onError: () => {
        toast.error("Failed to restart bot.");
      },
    }
  );

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

  const isDeploying =
    status?.botStatus === "deploying" || status?.botStatus === "pending";

  const connectedPlatforms =
    status?.accounts
      ?.filter((a) => a.status === "active")
      .map((a) => a.platform) ?? [];

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

      {/* Deploying banner */}
      {isDeploying && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 text-amber-600 animate-spin shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-amber-900">
                Your bot is starting up
              </h3>
              <p className="text-sm text-amber-700 mt-0.5">
                This usually takes a minute or two. If it seems stuck, you can
                restart the deployment.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 border-amber-300 text-amber-800 hover:bg-amber-100"
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
          </div>
        </div>
      )}

      {/* Bot ready banner */}
      {status?.botStatus === "running" && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-emerald-900">
                Your bot is ready!
              </h3>
              <p className="text-sm text-emerald-700 mt-0.5">
                Open Telegram and try sending one of these prompts — just copy
                and paste. The first reply may take up to 5 minutes while
                the bot wakes up.
              </p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {EXAMPLE_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="group flex items-start gap-2 rounded-xl bg-white/70 hover:bg-white px-3 py-2.5 text-sm text-emerald-800 text-left transition-colors cursor-pointer"
                onClick={() => {
                  navigator.clipboard.writeText(prompt);
                  setCopiedPrompt(prompt);
                  setTimeout(() => setCopiedPrompt(null), 2000);
                }}
              >
                <Sparkles className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span className="flex-1">&ldquo;{prompt}&rdquo;</span>
                {copiedPrompt === prompt ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-emerald-400 opacity-0 group-hover:opacity-100 shrink-0 mt-0.5 transition-opacity" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

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
            {(status?.botStatus === "running" ||
              status?.botStatus === "deploying") && (
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
                disabled={isDeploying}
              >
                Update token
              </Button>
              {isDeploying && (
                <p className="text-xs text-amber-500 mt-2">
                  Available once your bot finishes deploying.
                </p>
              )}
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
                disabled={isDeploying}
              >
                <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                Configure Telegram
              </Button>
              {isDeploying && (
                <p className="text-xs text-amber-500 mt-2">
                  Available once your bot finishes deploying.
                </p>
              )}
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
            disabled={isDeploying}
          />
          {isDeploying && (
            <p className="text-xs text-amber-500 mt-2">
              Available once your bot finishes deploying.
            </p>
          )}
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
