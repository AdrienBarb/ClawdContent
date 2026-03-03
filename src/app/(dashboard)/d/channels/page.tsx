"use client";

import { useState } from "react";
import { appRouter } from "@/lib/constants/appRouter";
import useApi from "@/lib/hooks/useApi";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import TelegramTokenModal from "@/components/dashboard/TelegramTokenModal";

interface DashboardStatus {
  botStatus: string | null;
  hasTelegramToken: boolean;
}

export default function ChannelsPage() {
  const { useGet } = useApi();
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

  const isDeploying =
    status?.botStatus === "deploying" || status?.botStatus === "pending";

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Channels
        </h1>
        <p className="text-gray-500 mt-1">
          Connect messaging platforms to chat with your bot.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* Telegram card */}
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#26A5E4] text-white">
              <MessageCircle className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Telegram</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                {status?.hasTelegramToken ? (
                  <>
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                    <span className="text-xs text-emerald-600">Connected</span>
                  </>
                ) : (
                  <>
                    <span className="inline-block h-2 w-2 rounded-full bg-gray-300" />
                    <span className="text-xs text-gray-400">
                      Not connected
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Chat with your AI content manager directly on Telegram.
          </p>
          <Button
            size="sm"
            variant={status?.hasTelegramToken ? "outline" : "default"}
            className={
              status?.hasTelegramToken
                ? ""
                : "bg-[#e8614d] hover:bg-[#d4563f] text-white"
            }
            onClick={() => setTelegramModalOpen(true)}
            disabled={isDeploying}
          >
            {status?.hasTelegramToken ? "Update token" : "Connect Telegram"}
          </Button>
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
