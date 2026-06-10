"use client";

import { CheckIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  PLANS,
  SHARED_FEATURES,
  DEFAULT_PLAN_ID,
  type PlanId,
} from "@/lib/constants/plans";

interface PricingCardsProps {
  onSelectPlan: (planId: PlanId) => void;
  loadingPlanId?: PlanId | null;
  currentPlanId?: PlanId | null;
  variant?: "landing" | "modal";
  ctaLabel?: string;
}

export default function PricingCards({
  onSelectPlan,
  loadingPlanId,
  currentPlanId,
  variant = "landing",
  ctaLabel,
}: PricingCardsProps) {
  const plan = PLANS[0];
  const isLoading = loadingPlanId === plan.id;
  const isCurrent = currentPlanId === plan.id;
  const isModal = variant === "modal";

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Single plan card */}
      <div className="rounded-2xl bg-white border-2 border-primary/30 p-8 shadow-sm">
        {/* Price */}
        <div className="text-center mb-8">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-5xl font-bold text-foreground">
              ${plan.monthlyPrice}
            </span>
            <span className="text-secondary-foreground text-lg">/mo</span>
          </div>
          <p className="text-sm text-secondary-foreground mt-2">
            Everything you need. One simple plan.
          </p>
        </div>

        {/* Features */}
        <div className="space-y-3 mb-8">
          <div className="flex items-center gap-3">
            <CheckIcon className="h-4 w-4 text-primary shrink-0" strokeWidth={2.5} />
            <span className="text-sm text-foreground">{plan.socialAccountLabel}</span>
          </div>
          {SHARED_FEATURES.map((feature, i) => (
            <div key={i} className="flex items-center gap-3">
              <CheckIcon className="h-4 w-4 text-primary shrink-0" strokeWidth={2.5} />
              <span className="text-sm text-foreground">{feature.label}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <Button
          className={`w-full bg-primary hover:bg-[#E84A36] text-primary-foreground rounded-full ${
            isModal ? "h-10" : "h-12"
          }`}
          onClick={() => onSelectPlan(DEFAULT_PLAN_ID)}
          disabled={isLoading || isCurrent}
        >
          {isLoading ? "Loading..." : isCurrent ? "Current plan" : ctaLabel ?? plan.cta}
        </Button>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Cancel anytime, two clicks.
        </p>
      </div>
    </div>
  );
}
