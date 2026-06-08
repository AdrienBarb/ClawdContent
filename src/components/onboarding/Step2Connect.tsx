"use client";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  SpinnerGapIcon,
} from "@phosphor-icons/react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import ConnectAccountButtons from "@/components/dashboard/ConnectAccountButtons";
import { appRouter } from "@/lib/constants/appRouter";
import useApi from "@/lib/hooks/useApi";
import type { OnboardingStatus } from "@/lib/schemas/onboarding";

// Onboarding focuses on the two platforms dominant among real users. The
// dashboard connect UI still offers every supported platform.
const ONBOARDING_PLATFORMS = ["instagram", "facebook"];

interface Props {
  status: OnboardingStatus | undefined;
  onRefetch: () => void;
  onBack: () => void;
  onNext: () => void;
}

export default function Step2Connect({
  status,
  onRefetch,
  onBack,
  onNext,
}: Props) {
  const { usePost } = useApi();
  const accounts = status?.accounts ?? [];
  const connectedPlatforms = accounts.map((a) => a.platform);
  const hasAccount = accounts.length > 0;

  const { mutate: save, isPending } = usePost(appRouter.api.onboardingSave, {
    onSuccess: () => onNext(),
    onError: (error: Error) =>
      toast.error(error.message || "Something went wrong."),
  });

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Connect an account
        </h1>
        <p className="text-gray-500 mt-2">
          Connect at least one social account. We&apos;ll learn how you post and
          draft content ready for it.
        </p>
      </div>

      <ConnectAccountButtons
        onAccountConnected={onRefetch}
        connectedPlatforms={connectedPlatforms}
        returnTo={`${appRouter.onboarding}?step=3`}
        onboarding
        allowedPlatforms={ONBOARDING_PLATFORMS}
      />

      {hasAccount && (
        <p className="mt-4 flex items-center justify-center gap-1.5 text-sm text-gray-500">
          <CheckIcon className="h-4 w-4 text-[#e8614d]" weight="bold" />
          {accounts.length} account{accounts.length > 1 ? "s" : ""} connected
        </p>
      )}

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
          className="bg-primary hover:bg-[#E84A36] text-white"
          disabled={!hasAccount || isPending}
          onClick={() => save({ step: 3 })}
        >
          {isPending ? (
            <SpinnerGapIcon className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Continue
              <ArrowRightIcon className="h-4 w-4 ml-1.5" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
