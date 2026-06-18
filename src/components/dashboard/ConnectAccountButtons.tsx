"use client";

import { useState } from "react";
import { appRouter } from "@/lib/constants/appRouter";
import { PLATFORMS } from "@/lib/constants/platforms";
import useApi from "@/lib/hooks/useApi";
import toast from "react-hot-toast";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  CheckIcon,
  SpinnerGapIcon,
} from "@phosphor-icons/react";

interface ConnectAccountButtonsProps {
  onAccountConnected?: () => void;
  connectedPlatforms?: string[];
  disabled?: boolean;
  onDisabledClick?: () => void;
  returnTo?: string;
  /**
   * Onboarding mode. Connects full-page (single window) and routes OAuth back
   * through the onboarding callback bridge so the user never sees the dashboard
   * shell. The dashboard uses the default popup + `/d` callback. A popup is
   * avoided here because its `window.opener` is unreliable across the
   * cross-origin OAuth round-trip (it gets severed).
   */
  onboarding?: boolean;
  /**
   * Restrict the picker to these platform ids (order preserved from PLATFORMS).
   * Onboarding uses it to focus on Instagram + Facebook; the dashboard shows
   * the full list when omitted.
   */
  allowedPlatforms?: string[];
  /**
   * Layout. "grid" (default) = the compact dashboard picker. "stack" =
   * full-width, vertically stacked, solid brand-fill buttons (onboarding).
   * Both platforms get equal treatment — no badges, no reordering.
   */
  variant?: "grid" | "stack";
}

export default function ConnectAccountButtons({
  onAccountConnected,
  connectedPlatforms = [],
  disabled = false,
  onDisabledClick,
  returnTo,
  onboarding = false,
  allowedPlatforms,
  variant = "grid",
}: ConnectAccountButtonsProps) {
  const { usePost } = useApi();
  const platforms = allowedPlatforms
    ? PLATFORMS.filter((p) => allowedPlatforms.includes(p.id))
    : PLATFORMS;
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(
    null
  );

  const { mutate: getConnectUrl } = usePost(appRouter.api.accountsConnect, {
    onSuccess: (data: { url: string }) => {
      if (onboarding) {
        window.location.assign(data.url);
        return;
      }

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
    getConnectUrl({ platform, returnTo, onboarding });
  };

  return (
    <div
      className={
        variant === "stack"
          ? "flex flex-col gap-3"
          : "grid grid-cols-2 sm:grid-cols-3 gap-2.5"
      }
    >
      {platforms.map((platform) => {
        const isConnecting = connectingPlatform === platform.id;
        const isConnected = connectedPlatforms.includes(platform.id);
        const isDisabled =
          isConnected ||
          connectingPlatform !== null ||
          (disabled && !onDisabledClick);
        const handleClick = () => {
          if (disabled && onDisabledClick) {
            onDisabledClick();
            return;
          }
          if (!isConnected && !disabled) handleConnect(platform.id);
        };

        if (variant === "stack") {
          return (
            <button
              key={platform.id}
              type="button"
              disabled={isDisabled}
              aria-busy={isConnecting}
              onClick={handleClick}
              className={`flex min-h-[56px] w-full items-center gap-3 rounded-2xl px-5 text-[15px] font-semibold transition-[filter,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 ${
                isConnected
                  ? "cursor-default border border-gray-200 bg-gray-50 text-gray-600"
                  : "cursor-pointer text-white hover:brightness-105 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
              }`}
              style={
                isConnected
                  ? undefined
                  : {
                      background: platform.solidFill,
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 3px rgba(0,0,0,0.12)",
                    }
              }
            >
              {isConnected ? (
                <CheckCircleIcon
                  className="h-5 w-5 shrink-0 text-green-600"
                  weight="fill"
                />
              ) : (
                <span className="shrink-0">{platform.iconLarge}</span>
              )}
              <span
                className="truncate"
                style={
                  isConnected
                    ? undefined
                    : { textShadow: "0 1px 1px rgba(0,0,0,0.18)" }
                }
              >
                {isConnecting
                  ? "Connecting…"
                  : isConnected
                    ? `${platform.label} connected`
                    : `Connect ${platform.label}`}
              </span>
              {!isConnected &&
                (isConnecting ? (
                  <SpinnerGapIcon className="ml-auto h-5 w-5 shrink-0 animate-spin" />
                ) : (
                  <ArrowRightIcon className="ml-auto h-5 w-5 shrink-0 opacity-90" />
                ))}
            </button>
          );
        }

        return (
          <button
            key={platform.id}
            disabled={isDisabled}
            aria-busy={isConnecting}
            onClick={handleClick}
            className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-all ${
              isConnected
                ? "border-gray-100 bg-gray-50 text-gray-400 cursor-default"
                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            }`}
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                isConnected ? "bg-gray-300 text-white" : "text-white"
              }`}
              style={
                isConnected ? undefined : { backgroundColor: platform.color }
              }
            >
              {isConnected ? <CheckIcon className="h-4 w-4" /> : platform.icon}
            </span>
            <span className="truncate">
              {isConnecting
                ? "Connecting…"
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
