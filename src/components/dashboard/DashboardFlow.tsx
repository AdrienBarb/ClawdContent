"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Rocket, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { appRouter } from "@/lib/constants/appRouter";
import useApi from "@/lib/hooks/useApi";
import TelegramSetup from "@/components/dashboard/TelegramSetup";
import BotDashboard from "@/components/dashboard/BotDashboard";
import SubscribeModal from "@/components/dashboard/SubscribeModal";

interface DashboardFlowProps {
  initialHasTelegramToken: boolean;
  initialHasSubscription: boolean;
  initialHasFlyMachine: boolean;
}

export default function DashboardFlow({
  initialHasTelegramToken,
  initialHasSubscription,
  initialHasFlyMachine,
}: DashboardFlowProps) {
  const router = useRouter();
  const { usePost } = useApi();
  const [hasTelegramToken, setHasTelegramToken] = useState(
    initialHasTelegramToken
  );
  const [showSubscribeModal, setShowSubscribeModal] = useState(
    !initialHasSubscription
  );
  const [launched, setLaunched] = useState(false);

  const { mutate: launchBot, isPending: launching } = usePost(
    appRouter.api.provisioningLaunch,
    {
      onSuccess: () => {
        setLaunched(true);
        router.refresh();
      },
    }
  );

  // Bot already provisioned → full dashboard
  if (initialHasFlyMachine || launched) {
    return <BotDashboard />;
  }

  // No Telegram token yet → show setup (with subscribe modal overlay if needed)
  if (!hasTelegramToken) {
    return (
      <>
        <TelegramSetup onSuccess={() => setHasTelegramToken(true)} />
        <SubscribeModal
          open={showSubscribeModal}
          onOpenChange={setShowSubscribeModal}
        />
      </>
    );
  }

  // Has token, no bot yet → "Launch my bot"
  return (
    <>
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)]">
        <div className="rounded-2xl border border-gray-200 bg-white p-10 max-w-md text-center shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#e8614d]/10 mx-auto mb-4">
            <Rocket className="h-7 w-7 text-[#e8614d]" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Ready to launch
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Your Telegram bot is configured. Launch your personal AI content
            manager.
          </p>
          <Button
            className="bg-[#e8614d] hover:bg-[#d4563f] text-white"
            disabled={launching}
            onClick={() => {
              if (!initialHasSubscription) {
                setShowSubscribeModal(true);
              } else {
                launchBot({});
              }
            }}
          >
            {launching ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <Rocket className="h-4 w-4 mr-1.5" />
            )}
            {launching ? "Launching..." : "Launch my bot"}
          </Button>
        </div>
      </div>

      <SubscribeModal
        open={showSubscribeModal}
        onOpenChange={setShowSubscribeModal}
      />
    </>
  );
}
