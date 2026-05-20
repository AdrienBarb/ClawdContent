"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import useApi from "@/lib/hooks/useApi";
import { appRouter } from "@/lib/constants/appRouter";
import { Button } from "@/components/ui/button";
import { SpinnerGapIcon } from "@phosphor-icons/react";

export function CheckoutClient({ cancelled }: { cancelled: boolean }) {
  const { usePost } = useApi();
  const [started, setStarted] = useState(false);

  const { mutate: startCheckout, isPending } = usePost(
    appRouter.api.checkout,
    {
      onSuccess: (data: { url: string }) => {
        if (data?.url) {
          window.location.href = data.url;
        } else {
          toast.error("Couldn't start checkout. Please try again.");
          setStarted(false);
        }
      },
      onError: () => {
        toast.error("Couldn't start checkout. Please try again.");
        setStarted(false);
      },
    }
  );

  const launch = () => {
    setStarted(true);
    startCheckout({ planId: "pro", interval: "monthly", intent: "onboarding" });
  };

  // Auto-launch when the user lands here for the first time (not after cancel)
  useEffect(() => {
    if (!cancelled && !started) {
      launch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            {cancelled ? "Resume your trial setup" : "Almost there"}
          </h1>
          <p className="text-[14px] text-gray-600 leading-relaxed">
            Your business profile and connected accounts are saved. Add a card
            to start your 3-day free trial — no charge until the trial ends.
          </p>
        </div>

        {cancelled ? (
          <div className="flex flex-col items-center gap-3">
            <Button
              onClick={launch}
              disabled={isPending || started}
              className="w-full bg-gradient-to-b from-[#ec6f5b] to-[#c84a35] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),_0_1px_2px_rgba(200,74,53,0.25)] hover:opacity-95"
            >
              {isPending || started ? (
                <>
                  <SpinnerGapIcon className="h-4 w-4 animate-spin" />
                  Opening checkout…
                </>
              ) : (
                "Continue to checkout"
              )}
            </Button>
            <p className="text-[12px] text-gray-500">
              You can cancel anytime in Billing.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-gray-600">
            <SpinnerGapIcon className="h-5 w-5 animate-spin" />
            <p className="text-[13px]">Opening secure checkout…</p>
          </div>
        )}
      </div>
    </div>
  );
}
