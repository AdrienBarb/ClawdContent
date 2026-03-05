"use client";

import { useState } from "react";
import { appRouter } from "@/lib/constants/appRouter";
import useApi from "@/lib/hooks/useApi";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { MessageCircle, Lock } from "lucide-react";
import TelegramTokenModal from "@/components/dashboard/TelegramTokenModal";
import SubscribeModal from "@/components/dashboard/SubscribeModal";

interface DashboardStatus {
  botStatus: string | null;
  hasTelegramToken: boolean;
  subscription: { status: string } | null;
}

export default function ChannelsPage() {
  const { useGet } = useApi();
  const [telegramModalOpen, setTelegramModalOpen] = useState(false);
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

  const subStatus = status?.subscription?.status;
  const hasActiveSubscription =
    subStatus === "active" || subStatus === "trialing" || subStatus === "past_due";

  const isDeploying =
    status?.botStatus === "deploying" || status?.botStatus === "pending";
  const isDisabled = !hasActiveSubscription || isDeploying;

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

      {/* Subscription gate banner */}
      {!hasActiveSubscription && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-center gap-3">
          <Lock className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-900">
              Launch your bot to connect channels
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              You need an active subscription to set up Telegram.
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
            onClick={() => {
              if (!hasActiveSubscription) {
                setShowSubscribeModal(true);
              } else {
                setTelegramModalOpen(true);
              }
            }}
            disabled={isDeploying && hasActiveSubscription}
          >
            {status?.hasTelegramToken ? "Update token" : "Connect Telegram"}
          </Button>
          {isDeploying && hasActiveSubscription && (
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

      <SubscribeModal
        open={showSubscribeModal}
        onOpenChange={setShowSubscribeModal}
      />
    </div>
  );
}
