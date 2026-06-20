"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SpinnerGapIcon } from "@phosphor-icons/react";
import { appRouter } from "@/lib/constants/appRouter";
import useApi from "@/lib/hooks/useApi";
import { captureClientEvent } from "@/lib/tracking/clientEvents";

/**
 * Onboarding-scoped OAuth callback bridge. Zernio returns here (full-page,
 * inside the onboarding shell) after a social account is authorized. We pull
 * the freshly-connected account into our DB via /api/accounts/callback, then
 * forward to the next onboarding step. The user never sees the dashboard.
 *
 * No popup/`window.opener` handshake here — onboarding connects full-page.
 */
export default function OnboardingConnectedBridge() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { usePost } = useApi();
  const [error, setError] = useState(false);

  const returnTo =
    searchParams.get("returnTo") || `${appRouter.onboarding}?step=3`;

  const { mutate: syncAccounts } = usePost(appRouter.api.accountsCallback, {
    // replace() keeps the bridge out of history — Back skips it.
    onSuccess: (data: { newAccounts?: unknown[] }) => {
      // Fire only when a real account landed — a no-op re-sync shouldn't count.
      if (data?.newAccounts && data.newAccounts.length > 0) {
        captureClientEvent("onboarding_account_connected");
        // Connecting full-page completes the Connect step (step 2 in
        // ONBOARDING_STEPS). The wizard remounts at step 3 after this redirect,
        // so its prev→prev+1 heuristic can't emit this transition — do it here.
        captureClientEvent("onboarding_step_completed", {
          step: 2,
          step_name: "Connect",
        });
      }
      router.replace(returnTo);
    },
    onError: () => setError(true),
  });

  useEffect(() => {
    syncAccounts({});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 text-center">
      {error ? (
        <>
          <p className="text-sm text-gray-600">
            Something went wrong connecting your account.
          </p>
          <button
            type="button"
            onClick={() => router.replace(returnTo)}
            className="mt-3 text-sm text-primary underline"
          >
            Back to onboarding
          </button>
        </>
      ) : (
        <>
          <SpinnerGapIcon className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-sm text-gray-600">
            Connecting your account…
          </p>
        </>
      )}
    </div>
  );
}
