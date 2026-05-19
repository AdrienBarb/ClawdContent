"use client";

import { ArrowLeftIcon, ArrowRightIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import ConnectAccountButtons from "@/components/dashboard/ConnectAccountButtons";
import { appRouter } from "@/lib/constants/appRouter";
import { ErrorBanner } from "./ErrorBanner";

export function ConnectStep({
  connectedPlatformIds,
  isLoading,
  error,
  onAccountConnected,
  onBack,
  onContinue,
  onRetry,
}: {
  connectedPlatformIds: string[];
  isLoading: boolean;
  error: string | null;
  onAccountConnected: () => void;
  onBack: () => void;
  onContinue: () => void;
  onRetry: () => void;
}) {
  const canContinue = connectedPlatformIds.length > 0;

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Connect your accounts
        </h1>
        <p className="text-gray-500 mt-2">
          Pick at least one to get started. You can add more anytime.
        </p>
      </div>

      {error && <ErrorBanner message={error} onRetry={onRetry} />}

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="h-12 rounded-xl bg-gray-100 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <ConnectAccountButtons
          connectedPlatforms={connectedPlatformIds}
          onAccountConnected={onAccountConnected}
          returnTo={appRouter.onboarding}
        />
      )}

      <div className="mt-6 text-center text-[12px] text-gray-500" aria-live="polite">
        {canContinue
          ? `${connectedPlatformIds.length} ${
              connectedPlatformIds.length === 1 ? "account" : "accounts"
            } connected`
          : "Connect at least one account to continue."}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back
        </button>
        <Button
          type="button"
          className="bg-primary hover:bg-[#c84a35] text-white"
          disabled={!canContinue}
          onClick={onContinue}
        >
          Continue
          <ArrowRightIcon className="h-4 w-4 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}
