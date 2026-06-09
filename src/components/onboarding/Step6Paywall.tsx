"use client";

import { LockSimpleIcon, SpinnerGapIcon } from "@phosphor-icons/react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { appRouter } from "@/lib/constants/appRouter";
import useApi from "@/lib/hooks/useApi";
import { useOnboardingPlan } from "@/lib/hooks/useOnboardingPlan";
import PlanReveal from "./PlanReveal";
import PlanBuilding from "./PlanBuilding";

export default function Step6Paywall() {
  const { usePost } = useApi();
  const { data: plan } = useOnboardingPlan();

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

  const startTrial = () =>
    checkout({
      planId: "pro",
      interval: "monthly",
      successUrl: `${appRouter.onboarding}?stripe_success=1`,
    });

  // Two states only: the plan is ready (reveal) or it's still loading. The
  // strategy is generated in the background and Inngest retries it on failure,
  // so the loading state always resolves into the reveal on its own.
  const readyPlan =
    plan?.status === "ready" && plan.after != null ? plan : null;

  return (
    <div>
      {readyPlan ? (
        <PlanReveal plan={readyPlan} />
      ) : (
        <PlanBuilding handle={plan?.account.handle} />
      )}

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 text-center">
        <div className="flex items-center justify-center gap-1.5 text-sm font-medium text-gray-900">
          <LockSimpleIcon className="h-4 w-4 text-[#e8614d]" />
          Start your 3-day free trial
        </div>
        <p className="mt-1 text-xs text-gray-500">
          $49/mo after your trial. Cancel anytime.
        </p>
        <Button
          type="button"
          className="mt-4 w-full bg-primary hover:bg-[#E84A36] text-white"
          disabled={isCheckingOut}
          onClick={startTrial}
        >
          {isCheckingOut ? (
            <>
              <SpinnerGapIcon className="h-4 w-4 mr-1.5 animate-spin" />
              Redirecting…
            </>
          ) : (
            "Start your 3-day free trial"
          )}
        </Button>
      </div>
    </div>
  );
}
