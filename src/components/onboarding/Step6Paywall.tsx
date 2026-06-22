"use client";

import { useEffect, useRef, useState } from "react";
import { SpinnerGapIcon } from "@phosphor-icons/react";
import toast from "react-hot-toast";
import { appRouter } from "@/lib/constants/appRouter";
import useApi from "@/lib/hooks/useApi";
import { captureClientEvent } from "@/lib/tracking/clientEvents";
import { useOnboardingPlan } from "@/lib/hooks/useOnboardingPlan";
import StrategyPaywallCard, { CTA_STYLE } from "./StrategyPaywallCard";

// Mirrors useOnboardingPlan's polling ceiling (48 × 2.5s) with a little slack:
// past this point we drop to a subscribe-anyway fallback so the paywall never
// hangs on a failed background generation.
const BUILDING_TIMEOUT_MS = 130_000;

/**
 * Final onboarding step. Unlike steps 1-5 it does NOT render inside
 * OnboardingShell — no progress stepper, no shared card frame. It takes over
 * the whole screen with a single global loader until the brand strategy is
 * ready, then reveals the standalone paywall card at once (never a half-built
 * plan). The strategy is generated in the background and Inngest retries it, so
 * the loader resolves on its own; a hard timeout falls back to a
 * subscribe-anyway state so the paywall can never hang.
 */
export default function Step6Paywall() {
  const { usePost } = useApi();
  const { data: plan } = useOnboardingPlan();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), BUILDING_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, []);

  // Full-screen takeover: lock the body so the wizard behind it can't scroll
  // through (mobile scroll-chaining).
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Analytics: paywall exposure marker (complements paywall_checkout_started).
  const paywallViewed = useRef(false);
  useEffect(() => {
    if (paywallViewed.current) return;
    paywallViewed.current = true;
    captureClientEvent("onboarding_paywall_viewed");
  }, []);

  const { mutate: checkout, isPending: isCheckingOut } = usePost(
    appRouter.api.checkout,
    {
      onSuccess: (data: { url: string }) => {
        window.location.href = data.url;
      },
      onError: (error: Error) =>
        toast.error(error.message || "Couldn't start checkout."),
    }
  );

  const subscribe = () =>
    checkout({
      planId: "pro",
      interval: "monthly",
      successUrl: `${appRouter.onboarding}?stripe_success=1`,
    });

  // A/B variant (resolved server-side; "discount" only when a real coupon
  // exists). Known as soon as /plan responds.
  const isDiscount = plan?.paywallVariant === "discount";
  const readyPlan =
    plan?.status === "ready" && plan.after != null ? plan : null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#f0ece4]">
      <div className="flex min-h-full items-center justify-center px-4 py-6">
        {readyPlan?.after ? (
          <StrategyPaywallCard
            after={readyPlan.after}
            isDiscount={isDiscount}
            onSubscribe={subscribe}
            isCheckingOut={isCheckingOut}
          />
        ) : timedOut ? (
          <div
            className="w-full max-w-[400px] rounded-[24px] bg-white p-7 text-center shadow-[0_2px_4px_rgba(45,42,37,0.04),0_24px_60px_-20px_rgba(45,42,37,0.28)]"
            role="status"
            aria-live="polite"
          >
            <h1 className="text-[19px] font-semibold tracking-tight text-[#231f1b]">
              Your plan is taking a little longer
            </h1>
            <p className="mt-2 text-[14px] leading-relaxed text-[#6b5d54]">
              We&apos;re still putting it together in the background. Activate
              now and your full plan plus your first week of posts will be
              waiting inside.
            </p>
            <button
              type="button"
              onClick={subscribe}
              disabled={isCheckingOut}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-[16px] py-3.5 text-[15px] font-semibold text-white transition-[filter,transform] hover:brightness-[1.03] active:translate-y-px disabled:pointer-events-none disabled:opacity-60"
              style={CTA_STYLE}
            >
              {isCheckingOut ? (
                <>
                  <SpinnerGapIcon className="h-5 w-5 animate-spin" />
                  Redirecting…
                </>
              ) : (
                "Activate my plan"
              )}
            </button>
          </div>
        ) : (
          <div
            className="flex flex-col items-center text-center"
            role="status"
            aria-live="polite"
          >
            <SpinnerGapIcon
              className="h-7 w-7 animate-spin text-[#c84a35]"
              aria-hidden
            />
            <h1 className="mt-5 text-[20px] font-semibold tracking-tight text-[#231f1b]">
              Building your strategy
            </h1>
            <p className="mt-2 max-w-[300px] text-[14px] leading-relaxed text-[#6b5d54]">
              We&apos;re writing a growth plan built around your business and
              your goal. This usually takes under a minute.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
