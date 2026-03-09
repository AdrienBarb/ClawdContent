"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { appRouter } from "@/lib/constants/appRouter";
import useApi from "@/lib/hooks/useApi";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  RefreshCw,
  AlertCircle,
  MessageCircle,
  CheckCircle2,
  ExternalLink,
  Settings,
} from "lucide-react";
import TelegramTokenModal from "@/components/dashboard/TelegramTokenModal";

declare global {
  interface Window {
    twq?: (...args: unknown[]) => void;
    rdt?: (...args: unknown[]) => void;
  }
}

interface DashboardStatus {
  botStatus: string | null;
  hasTelegramToken: boolean;
  subscription: { status: string } | null;
  accounts: { id: string; platform: string; username: string }[];
}

export default function BotDashboard() {
  const { useGet, usePost, usePatch } = useApi();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [botReady, setBotReady] = useState(false);
  const [tokenModalOpen, setTokenModalOpen] = useState(false);

  // Conversion tracking on successful payment
  useEffect(() => {
    if (searchParams.get("payment") === "success") {
      window.twq?.("event", "tw-r799m-r799n", {});
      window.rdt?.("track", "Purchase");
      router.replace("/d", { scroll: false });
    }
  }, [searchParams, router]);

  const {
    data: status,
    isLoading,
    refetch,
  } = useGet(appRouter.api.dashboardStatus, undefined, {
    refetchInterval: botReady ? false : 3000,
  }) as {
    data: DashboardStatus | undefined;
    isLoading: boolean;
    refetch: () => void;
  };

  const botStatus = status?.botStatus ?? null;
  const isProvisioning =
    botStatus === "pending" || botStatus === "deploying";

  // Stop polling once bot is running
  useEffect(() => {
    if (botStatus === "running") {
      setBotReady(true);
    }
  }, [botStatus]);

  const { mutate: retryProvisioning, isPending: retrying } = usePost(
    appRouter.api.provisioningRetry,
    { onSuccess: () => refetch() }
  );

  const { mutate: restartBot, isPending: restarting } = usePatch(
    appRouter.api.bot,
    {
      onSuccess: () => {
        setBotReady(false);
        refetch();
      },
    }
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-[#e8614d] mb-4" />
      </div>
    );
  }

  // Provisioning in progress
  if (isProvisioning) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-[#e8614d] mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          Your bot is starting up...
        </h2>
        <p className="text-sm text-gray-500">
          This usually takes a minute or two.
        </p>
      </div>
    );
  }

  // Failed
  if (botStatus === "failed") {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)]">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 max-w-md text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-red-900 mb-1">
            Something went wrong
          </h2>
          <p className="text-sm text-red-700 mb-4">
            Your bot failed to start. You can retry the setup.
          </p>
          <Button
            className="bg-red-500 hover:bg-red-600 text-white"
            onClick={() => retryProvisioning({})}
            disabled={retrying}
          >
            {retrying ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1.5" />
            )}
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Bot is running
  if (botStatus === "running") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            Your bot
          </h1>
          <p className="text-gray-500 mt-1">
            Chat with your AI content manager on Telegram.
          </p>
        </div>

        {/* Missing Telegram token warning */}
        {!status?.hasTelegramToken && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900">
                Telegram not connected
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Your bot is running but not connected to Telegram yet.
              </p>
            </div>
            <Button
              size="sm"
              className="bg-[#e8614d] hover:bg-[#d4563f] text-white shrink-0"
              onClick={() => setTokenModalOpen(true)}
            >
              Connect
            </Button>
          </div>
        )}

        {/* Bot status card */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#26A5E4] text-white">
                <MessageCircle className="h-6 w-6" />
              </span>
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  Telegram Bot
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm text-emerald-600 font-medium">
                    Running
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTokenModalOpen(true)}
              >
                <Settings className="h-4 w-4 mr-1.5" />
                Update token
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => restartBot({})}
                disabled={restarting}
              >
                {restarting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-1.5" />
                )}
                Restart
              </Button>
            </div>
          </div>

          <p className="text-sm text-gray-500">
            Open your bot on Telegram to start creating and publishing content.
            You can also connect your social accounts from the{" "}
            <a
              href={appRouter.accounts}
              className="text-[#e8614d] font-medium hover:underline"
            >
              Accounts
            </a>{" "}
            page.
          </p>
        </div>

        {/* Connected accounts summary */}
        {status?.accounts && status.accounts.length > 0 && (
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Connected accounts
            </h3>
            <div className="space-y-2">
              {status.accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center gap-2 text-sm text-gray-600"
                >
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="capitalize">{account.platform}</span>
                  <span className="text-gray-400">@{account.username}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <TelegramTokenModal
          open={tokenModalOpen}
          onOpenChange={setTokenModalOpen}
          onSuccess={refetch}
        />
      </div>
    );
  }

  // No bot yet (null status) — shouldn't normally happen after onboarding
  // but handle gracefully
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)]">
      <Loader2 className="h-8 w-8 animate-spin text-[#e8614d] mb-4" />
      <h2 className="text-lg font-semibold text-gray-900 mb-1">
        Setting things up...
      </h2>
      <p className="text-sm text-gray-500">
        Your bot will be ready in a moment.
      </p>
    </div>
  );
}
