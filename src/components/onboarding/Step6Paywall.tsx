"use client";

import toast from "react-hot-toast";
import { appRouter } from "@/lib/constants/appRouter";
import useApi from "@/lib/hooks/useApi";
import { useOnboardingPlan } from "@/lib/hooks/useOnboardingPlan";
import PlanReveal from "./PlanReveal";
import PlanBuilding from "./PlanBuilding";
import OnboardingShell from "./OnboardingShell";

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

  return (
    <OnboardingShell
      step={6}
      onSubmit={subscribe}
      ctaLabel="Activate my plan"
      submittingLabel="Redirecting…"
      isSubmitting={isCheckingOut}
      ctaArrow={false}
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
        <PlanBuilding handle={plan?.account.handle} />
      )}
    </OnboardingShell>
  );
}
