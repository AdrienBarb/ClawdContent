"use client";

import { useState } from "react";
import { appRouter } from "@/lib/constants/appRouter";
import { PLATFORMS } from "@/lib/constants/platforms";
import useApi from "@/lib/hooks/useApi";
import toast from "react-hot-toast";
import { CheckIcon } from "@phosphor-icons/react";

interface ConnectAccountButtonsProps {
  onAccountConnected?: () => void;
  connectedPlatforms?: string[];
  disabled?: boolean;
  onDisabledClick?: () => void;
  returnTo?: string;
}

export default function ConnectAccountButtons({
  onAccountConnected,
  connectedPlatforms = [],
  disabled = false,
  onDisabledClick,
  returnTo,
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
    getConnectUrl({ platform, returnTo });
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
      {PLATFORMS.map((platform) => {
        const isConnecting = connectingPlatform === platform.id;
        const isConnected = connectedPlatforms.includes(platform.id);

        return (
          <button
            key={platform.id}
            className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-all ${
              isConnected
                ? "border-gray-100 bg-gray-50 text-gray-400 cursor-default"
                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            }`}
            disabled={
              isConnected ||
              connectingPlatform !== null ||
              (disabled && !onDisabledClick)
            }
            onClick={() => {
              if (disabled && onDisabledClick) {
                onDisabledClick();
                return;
              }
              if (!isConnected && !disabled) handleConnect(platform.id);
            }}
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                isConnected ? "bg-gray-300 text-white" : "text-white"
              }`}
              style={
                isConnected ? undefined : { backgroundColor: platform.color }
              }
            >
              {isConnected ? (
                <CheckIcon className="h-4 w-4" />
              ) : (
                platform.icon
              )}
            </span>
            <span className="truncate">
              {isConnecting
                ? "Connecting..."
                : isConnected
                  ? `${platform.label} ✓`
                  : platform.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
