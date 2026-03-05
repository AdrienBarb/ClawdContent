"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { appRouter } from "@/lib/constants/appRouter";
import useApi from "@/lib/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, AlertCircle } from "lucide-react";
import ChatInterface from "@/components/dashboard/ChatInterface";

declare global {
  interface Window {
    twq?: (...args: unknown[]) => void;
    rdt?: (...args: unknown[]) => void;
  }
}

interface DashboardStatus {
  botStatus: string | null;
}

export default function ChatWithLoader() {
  const { useGet, usePost } = useApi();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [botReady, setBotReady] = useState(false);

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
    botStatus === null || botStatus === "pending" || botStatus === "deploying";

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

  if (isLoading || isProvisioning) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)]">
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

  if (botStatus === "failed") {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)]">
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

  return <ChatInterface />;
}
