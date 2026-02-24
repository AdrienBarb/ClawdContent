"use client";

import { useState } from "react";
import { appRouter } from "@/lib/constants/appRouter";
import { PLATFORMS } from "@/lib/constants/platforms";
import useApi from "@/lib/hooks/useApi";
import toast from "react-hot-toast";

interface ConnectAccountButtonsProps {
  onAccountConnected?: () => void;
}

export default function ConnectAccountButtons({
  onAccountConnected,
}: ConnectAccountButtonsProps) {
  const { usePost } = useApi();
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(
    null
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
          setConnectingPlatform(null);
          onAccountConnected?.();
        }
      }, 500);
    },
    onError: () => {
      toast.error("Failed to start connection. Please try again.");
      setConnectingPlatform(null);
    },
  });

  const handleConnect = (platform: string) => {
    setConnectingPlatform(platform);
    getConnectUrl({ platform });
  };

  return (
    <div className="grid grid-cols-2 gap-2.5">
      {PLATFORMS.map((platform) => {
        const isConnecting = connectingPlatform === platform.id;

        return (
          <button
            key={platform.id}
            className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-700 transition-all hover:border-gray-300 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            disabled={connectingPlatform !== null}
            onClick={() => handleConnect(platform.id)}
          >
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white"
              style={{ backgroundColor: platform.color }}
            >
              {platform.icon}
            </span>
            {isConnecting ? "Connecting..." : platform.label}
          </button>
        );
      })}
    </div>
  );
}
