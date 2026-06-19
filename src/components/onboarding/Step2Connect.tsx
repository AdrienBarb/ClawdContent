"use client";

import { CheckIcon } from "@phosphor-icons/react";
import toast from "react-hot-toast";
import ConnectAccountButtons from "@/components/dashboard/ConnectAccountButtons";
import { appRouter } from "@/lib/constants/appRouter";
import useApi from "@/lib/hooks/useApi";
import type { OnboardingStatus } from "@/lib/schemas/onboarding";
import OnboardingShell from "./OnboardingShell";

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
    <OnboardingShell
      step={2}
      title="Connect your social accounts"
      subtitle="Link your Instagram. We'll see what's worked for you before, so the posts we plan fit your account from day one."
      onBack={onBack}
      onSubmit={() => save({ step: 3 })}
      ctaLabel="Continue"
      ctaDisabled={!hasAccount}
      isSubmitting={isPending}
    >
      <ConnectAccountButtons
        onAccountConnected={onRefetch}
        connectedPlatforms={connectedPlatforms}
        returnTo={`${appRouter.onboarding}?step=3`}
        onboarding
        variant="stack"
      />

      {hasAccount && (
        <p className="mt-4 flex items-center justify-center gap-1.5 text-sm text-gray-500">
          <CheckIcon className="h-4 w-4 text-[#e8614d]" weight="bold" />
          Account connected
        </p>
      )}
    </OnboardingShell>
  );
}
