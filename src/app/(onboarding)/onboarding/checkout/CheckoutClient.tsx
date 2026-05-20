"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { SpinnerGapIcon } from "@phosphor-icons/react";
import { useStartCheckout } from "@/lib/hooks/useStartCheckout";

export function CheckoutClient({ cancelled }: { cancelled: boolean }) {
  const { start, isOpening, hasErrored } = useStartCheckout();
  // Ref-based guard prevents React 18 strict-mode double-mount from creating
  // two parallel Stripe sessions (and therefore two Stripe customers).
  const launched = useRef(false);

  useEffect(() => {
    if (cancelled || launched.current) return;
    launched.current = true;
    start();
  }, [cancelled, start]);

  const showResumeUI = cancelled || hasErrored;

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            {showResumeUI ? "Resume your trial setup" : "Almost there"}
          </h1>
          <p className="text-[14px] text-gray-600 leading-relaxed">
            Your business profile and connected accounts are saved. Add a card
            to start your 3-day free trial — no charge until the trial ends.
          </p>
        </div>

        {showResumeUI ? (
          <div className="flex flex-col items-center gap-3">
            <Button
              onClick={start}
              disabled={isOpening}
              className="w-full bg-gradient-to-b from-[#ec6f5b] to-[#c84a35] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),_0_1px_2px_rgba(200,74,53,0.25)] hover:opacity-95"
            >
              {isOpening ? (
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
          <div
            role="status"
            aria-live="polite"
            className="flex flex-col items-center gap-3 text-gray-600"
          >
            <SpinnerGapIcon className="h-5 w-5 animate-spin" />
            <p className="text-[13px]">Opening secure checkout…</p>
            <span className="sr-only">
              Redirecting to checkout. This may take a moment.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
