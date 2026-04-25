"use client";

import { useState } from "react";
import { XIcon } from "@phosphor-icons/react";
import { appRouter } from "@/lib/constants/appRouter";
import useApi from "@/lib/hooks/useApi";
import PricingCards from "@/components/PricingCards";
import type { PlanId, BillingInterval } from "@/lib/constants/plans";

interface SubscribeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SubscribeModal({
  open,
  onOpenChange,
}: SubscribeModalProps) {
  const { usePost } = useApi();
  const [loadingPlanId, setLoadingPlanId] = useState<PlanId | null>(null);

  const { mutate: createCheckout } = usePost(appRouter.api.checkout, {
    onSuccess: (data: { url: string }) => {
      window.location.href = data.url;
    },
    onSettled: () => setLoadingPlanId(null),
  });

  const handleSelectPlan = (planId: PlanId, interval: BillingInterval) => {
    setLoadingPlanId(planId);
    createCheckout({ planId, interval });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 overflow-y-auto">
      <div className="min-h-full flex items-start justify-center px-4 py-10">
        <div className="relative w-full max-w-4xl rounded-2xl border border-border bg-card shadow-xl p-6 md:p-8">
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors cursor-pointer z-10"
          >
            <XIcon className="h-5 w-5" weight="bold" />
          </button>

          <div className="text-center mb-6">
            <h1 className="text-xl font-semibold tracking-tight text-foreground mb-1">
              Choose your plan
            </h1>
            <p className="text-sm text-muted-foreground">
              Start publishing everywhere with your AI social media manager.
            </p>
          </div>

          <PricingCards
            onSelectPlan={handleSelectPlan}
            loadingPlanId={loadingPlanId}
            variant="modal"
            ctaLabel="Subscribe now"
          />
        </div>
      </div>
    </div>
  );
}
