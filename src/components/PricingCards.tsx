"use client";

import { useState } from "react";
import { CheckIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  PLANS,
  SHARED_FEATURES,
  DEFAULT_PLAN_ID,
  type PlanId,
  type BillingInterval,
  getDisplayPrice,
} from "@/lib/constants/plans";

interface PricingCardsProps {
  onSelectPlan: (planId: PlanId, interval: BillingInterval) => void;
  loadingPlanId?: PlanId | null;
  currentPlanId?: PlanId | null;
  variant?: "landing" | "modal";
}

export default function PricingCards({
  onSelectPlan,
  loadingPlanId,
  currentPlanId,
  variant = "landing",
}: PricingCardsProps) {
  const [interval, setInterval] = useState<BillingInterval>("monthly");

  const plan = PLANS[0];
  const price = getDisplayPrice(plan, interval);
  const isLoading = loadingPlanId === plan.id;
  const isCurrent = currentPlanId === plan.id;
  const isModal = variant === "modal";

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Monthly/Yearly toggle */}
      <div className="flex justify-center mb-10">
        <div className="inline-flex rounded-full p-1 bg-border border border-border">
          <button
            onClick={() => setInterval("monthly")}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all cursor-pointer ${
              interval === "monthly"
                ? "bg-primary text-primary-foreground"
                : "text-secondary-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setInterval("yearly")}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all cursor-pointer ${
              interval === "yearly"
                ? "bg-primary text-primary-foreground"
                : "text-secondary-foreground hover:text-foreground"
            }`}
          >
            Yearly
            <span className="ml-1.5 text-xs opacity-80">-30%</span>
          </button>
        </div>
      </div>

      {/* Single plan card */}
      <div className="rounded-2xl bg-white border-2 border-primary/30 p-8 shadow-sm">
        {/* Price */}
        <div className="text-center mb-8">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-5xl font-bold text-foreground">
              ${price % 1 === 0 ? price : price.toFixed(2)}
            </span>
            <span className="text-secondary-foreground text-lg">/mo</span>
          </div>
          {interval === "yearly" && (
            <p className="text-sm text-emerald-600 mt-1">
              Save 30% — billed yearly
            </p>
          )}
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
          onClick={() => onSelectPlan(DEFAULT_PLAN_ID, interval)}
          disabled={isLoading || isCurrent}
        >
          {isLoading ? "Loading..." : isCurrent ? "Current plan" : plan.cta}
        </Button>

        <p className="text-center text-xs text-muted-foreground mt-4">
          5 posts free, then $49/mo. Cancel anytime.
        </p>
      </div>
    </div>
  );
}
