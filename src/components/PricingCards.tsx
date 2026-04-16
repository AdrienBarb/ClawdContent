"use client";

import { useState } from "react";
import { CheckIcon, MinusIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  PLANS,
  SHARED_FEATURES,
  isFeatureIncluded,
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
  const defaultSelected = currentPlanId || "pro";
  const [selectedPlanId, setSelectedPlanId] =
    useState<PlanId>(defaultSelected);

  const isModal = variant === "modal";
  const isExistingSubscriber = !!currentPlanId;
  const selectedPlan = PLANS.find((p) => p.id === selectedPlanId)!;
  const isLoading = loadingPlanId === selectedPlanId;
  const isCurrent = currentPlanId === selectedPlanId;

  const planOrder = PLANS.map((p) => p.id);
  const currentIndex = currentPlanId
    ? planOrder.indexOf(currentPlanId)
    : -1;
  const selectedIndex = planOrder.indexOf(selectedPlanId);
  const isUpgrade = isExistingSubscriber && selectedIndex > currentIndex;
  const isDowngrade = isExistingSubscriber && selectedIndex < currentIndex;

  function getCtaLabel() {
    if (isLoading) return "Loading...";
    if (isCurrent) return "Current plan";
    if (isUpgrade) return "Upgrade";
    if (isDowngrade) return "Downgrade";
    return selectedPlan.cta;
  }

  return (
    <div className="w-full">
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

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
        {/* Left: Plan selector */}
        <div className="space-y-3">
          {PLANS.map((plan) => {
            const price = getDisplayPrice(plan, interval);
            const isSelected = selectedPlanId === plan.id;

            return (
              <button
                key={plan.id}
                onClick={() => setSelectedPlanId(plan.id)}
                className={`w-full text-left rounded-2xl p-5 transition-all cursor-pointer ${
                  isSelected
                    ? "bg-white border-2 border-primary/60 shadow-md"
                    : "bg-white border border-border hover:border-border shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Radio indicator */}
                    <div
                      className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        isSelected
                          ? "border-primary bg-primary"
                          : "border-[#c5c8de]"
                      }`}
                    >
                      {isSelected && (
                        <CheckIcon className="h-3 w-3 text-primary-foreground" strokeWidth={3} />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">
                          {plan.name}
                        </span>
                        {plan.highlighted && (
                          <span className="text-[10px] font-semibold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                            Popular
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-secondary-foreground mt-0.5">
                        {plan.socialAccountLabel}
                        {isExistingSubscriber && currentPlanId === plan.id && (
                          <span className="text-primary ml-2">
                            Current
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-bold text-foreground">
                      ${price % 1 === 0 ? price : price.toFixed(2)}
                    </span>
                    <span className="text-secondary-foreground text-sm">/mo</span>
                    {interval === "yearly" && (
                      <p className="text-[11px] text-emerald-600">Save 30%</p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}

          {/* CTA button */}
          <Button
            className={`w-full bg-primary hover:bg-primary text-primary-foreground mt-2 rounded-full ${
              isModal ? "h-10" : "h-12"
            }`}
            onClick={() => onSelectPlan(selectedPlanId, interval)}
            disabled={isLoading || isCurrent}
          >
            {getCtaLabel()}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Cancel anytime. No contracts.
          </p>
        </div>

        {/* Right: Features */}
        <div className="rounded-2xl bg-white border border-border p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-secondary-foreground mb-5">
            Includes
          </p>

          <div className="space-y-2 mb-5 pb-5 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                {selectedPlan.socialAccountLabel}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                {selectedPlan.imageCreditsPerMonth > 0
                  ? `${selectedPlan.imageCreditsPerMonth} AI image credits/month`
                  : "No AI image credits"}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {SHARED_FEATURES.map((feature, i) => {
              const included = isFeatureIncluded(feature, selectedPlanId);
              return (
                <div key={i} className="flex items-center justify-between">
                  <span
                    className={`text-sm ${
                      included ? "text-foreground" : "text-border"
                    }`}
                  >
                    {feature.label}
                  </span>
                  {included ? (
                    <CheckIcon
                      className="h-4 w-4 text-primary shrink-0"
                      strokeWidth={2.5}
                    />
                  ) : (
                    <MinusIcon className="h-4 w-4 text-border shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
