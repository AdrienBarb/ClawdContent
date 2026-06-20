"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, SpinnerGapIcon } from "@phosphor-icons/react";
import toast from "react-hot-toast";
import { appRouter } from "@/lib/constants/appRouter";
import useApi from "@/lib/hooks/useApi";
import { captureClientEvent } from "@/lib/tracking/clientEvents";
import { useOnboardingPlan } from "@/lib/hooks/useOnboardingPlan";
import PlanReveal from "./PlanReveal";
import PlanBuilding from "./PlanBuilding";
import OnboardingShell from "./OnboardingShell";

// Mirrors useOnboardingPlan's polling ceiling (48 × 2.5s) with a little slack:
// past this point the building state switches to a subscribe-anyway fallback
// so the paywall never hangs on a failed background generation.
const BUILDING_TIMEOUT_MS = 130_000;

// Subscribe CTA in the tinted paywall footer — coral gradient per the design
// system, with a slightly stronger shadow to lift off the warm wash.
const OFFER_CTA_STYLE = {
  background: "linear-gradient(180deg, #ec6f5b 0%, #c84a35 100%)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.18), 0 2px 6px rgba(200,74,53,0.28)",
};

export default function Step6Paywall() {
  const { usePost } = useApi();
  const { data: plan } = useOnboardingPlan();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), BUILDING_TIMEOUT_MS);
    return () => clearTimeout(t);
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

  // Two states only: the plan is ready (reveal) or it's still loading. The
  // strategy is generated in the background and Inngest retries it on failure,
  // so the loading state always resolves into the reveal on its own. The
  // subscribe CTA lives in the shell footer like every other step.
  const readyPlan =
    plan?.status === "ready" && plan.after != null ? plan : null;

  // A/B test (resolved server-side; "discount" only when a real coupon exists).
  // The variant is known as soon as /plan responds — even while the strategy is
  // still generating — so the offer footer shows during the loading state too.
  const isDiscount = plan?.paywallVariant === "discount";
  const ctaLabel = "Activate my plan";

  const features = isDiscount
    ? ["Cancel anytime", "No contract", "50% off"]
    : ["Cancel anytime", "No contract", "Save $900+/mo"];

  // Footer content (the shell tints the footer itself): value anchor + bold
  // price (A: $99; B: $99 struck → $49) with the CTA on one row, trust checks
  // below. Sized for a footer — not a standalone card. Shown as soon as the
  // plan endpoint responds (building or ready), so it's consistent while the
  // strategy is still generating.
  const footerOffer = !plan ? undefined : (
    <>
      <div className="flex items-center justify-between gap-5">
        <div className="min-w-0">
          <p className="mb-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#a98a7b]">
            {isDiscount
              ? "First month — then $99/mo"
              : "A freelancer costs $1,000–$2,500/mo"}
          </p>
          <div className="flex items-end gap-1.5">
            {isDiscount && (
              <span className="text-[21px] font-extrabold leading-[0.85] tracking-tight tabular-nums text-[#c3ab9f] line-through">
                $99
              </span>
            )}
            <span className="text-[34px] font-extrabold leading-[0.85] tracking-tight tabular-nums text-[#241f1b]">
              {isDiscount ? "$49" : "$99"}
            </span>
            <span className="pb-[3px] text-[15px] font-medium text-[#a98a7b]">
              /mo
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={subscribe}
          disabled={isCheckingOut}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-6 py-3 text-[14px] font-semibold text-white transition-[filter,transform] hover:brightness-[1.03] active:translate-y-px disabled:pointer-events-none disabled:opacity-60"
          style={OFFER_CTA_STYLE}
        >
          {isCheckingOut ? (
            <>
              <SpinnerGapIcon className="h-4 w-4 animate-spin" />
              Redirecting…
            </>
          ) : (
            ctaLabel
          )}
        </button>
      </div>

      <div className="my-3 h-px bg-[#efdcd3]" />

      <div className="flex flex-wrap items-center justify-center gap-x-[18px] gap-y-1.5">
        {features.map((f) => (
          <span
            key={f}
            className="flex items-center gap-1.5 text-[12.5px] font-medium text-[#6b5d54]"
          >
            <CheckIcon
              weight="bold"
              className="h-[13px] w-[13px] shrink-0 text-[#c84a35]"
            />
            {f}
          </span>
        ))}
      </div>
    </>
  );

  return (
    <OnboardingShell
      step={6}
      onSubmit={subscribe}
      ctaLabel={ctaLabel}
      submittingLabel="Redirecting…"
      isSubmitting={isCheckingOut}
      ctaArrow={false}
      footerOffer={footerOffer}
      footMicro={
        <>
          <span className="font-medium text-gray-600">$99/mo</span> · cancel
          anytime
        </>
      }
    >
      {readyPlan ? (
        <PlanReveal plan={readyPlan} />
      ) : (
        <PlanBuilding handle={plan?.account?.handle} timedOut={timedOut} />
      )}
    </OnboardingShell>
  );
}
