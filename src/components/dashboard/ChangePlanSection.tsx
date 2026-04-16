"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { appRouter } from "@/lib/constants/appRouter";
import useApi from "@/lib/hooks/useApi";
import PricingCards from "@/components/PricingCards";
import type { PlanId, BillingInterval } from "@/lib/constants/plans";
import toast from "react-hot-toast";

interface ChangePlanSectionProps {
  currentPlanId: PlanId;
}

export default function ChangePlanSection({
  currentPlanId,
}: ChangePlanSectionProps) {
  const router = useRouter();
  const { usePost } = useApi();
  const [loadingPlanId, setLoadingPlanId] = useState<PlanId | null>(null);

  const { mutate: changePlan } = usePost(appRouter.api.billingChangePlan, {
    onSuccess: () => {
      toast.success("Plan updated successfully!");
      setLoadingPlanId(null);
      router.refresh();
    },
    onError: (error: { error?: string }) => {
      setLoadingPlanId(null);
      const message =
        error?.error || "Failed to change plan. Please try again.";
      toast.error(message);
    },
  });

  const handleSelectPlan = (planId: PlanId, interval: BillingInterval) => {
    if (planId === currentPlanId) return;
    setLoadingPlanId(planId);
    changePlan({ planId, interval });
  };

  return (
    <div className="rounded-2xl bg-card p-6 shadow-sm border border-border">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-5">
        Change Plan
      </p>
      <PricingCards
        onSelectPlan={handleSelectPlan}
        loadingPlanId={loadingPlanId}
        currentPlanId={currentPlanId}
        variant="modal"
      />
    </div>
  );
}
