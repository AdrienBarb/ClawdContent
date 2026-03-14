"use client";

import { useState } from "react";
import { Check, Minus } from "lucide-react";
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
        <div className="inline-flex rounded-full p-1 bg-[#1e2233] border border-[#2a2f45]">
          <button
            onClick={() => setInterval("monthly")}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all cursor-pointer ${
              interval === "monthly"
                ? "bg-[#e8614d] text-white"
                : "text-[#7a7f94] hover:text-white"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setInterval("yearly")}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all cursor-pointer ${
              interval === "yearly"
                ? "bg-[#e8614d] text-white"
                : "text-[#7a7f94] hover:text-white"
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
                    ? "bg-[#151929] border-2 border-[#e8614d]/60 shadow-[0_0_20px_rgba(232,97,77,0.08)]"
                    : "bg-[#151929] border border-[#1e2233] hover:border-[#2a2f45]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Radio indicator */}
                    <div
                      className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        isSelected
                          ? "border-[#e8614d] bg-[#e8614d]"
                          : "border-[#3a3f52]"
                      }`}
                    >
                      {isSelected && (
                        <Check className="h-3 w-3 text-white" strokeWidth={3} />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">
                          {plan.name}
                        </span>
                        {plan.highlighted && (
                          <span className="text-[10px] font-semibold bg-[#e8614d] text-white px-2 py-0.5 rounded-full">
                            Popular
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#7a7f94] mt-0.5">
                        {plan.socialAccountLabel}
                        {plan.hasTrial && !isExistingSubscriber && (
                          <span className="text-green-400 ml-2">
                            {plan.trialDays}-day free trial
                          </span>
                        )}
                        {isExistingSubscriber && currentPlanId === plan.id && (
                          <span className="text-[#e8614d] ml-2">
                            Current
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-bold text-white">
                      ${price % 1 === 0 ? price : price.toFixed(2)}
                    </span>
                    <span className="text-[#7a7f94] text-sm">/mo</span>
                    {interval === "yearly" && (
                      <p className="text-[11px] text-green-400">Save 30%</p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}

          {/* CTA button */}
          <Button
            className={`w-full bg-[#e8614d] hover:bg-[#d4563f] text-white mt-2 ${
              isModal ? "h-10" : "h-12"
            }`}
            onClick={() => onSelectPlan(selectedPlanId, interval)}
            disabled={isLoading || isCurrent}
          >
            {getCtaLabel()}
          </Button>

          <p className="text-center text-xs text-[#555a6b]">
            Cancel anytime. No contracts.
          </p>
        </div>

        {/* Right: Features */}
        <div className="rounded-2xl bg-[#151929] border border-[#1e2233] p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#7a7f94] mb-5">
            Includes
          </p>

          <div className="flex items-center gap-2 mb-5 pb-5 border-b border-[#1e2233]">
            <span className="text-sm font-medium text-white">
              {selectedPlan.socialAccountLabel}
            </span>
          </div>

          <div className="space-y-4">
            {SHARED_FEATURES.map((feature, i) => {
              const included = isFeatureIncluded(feature, selectedPlanId);
              return (
                <div key={i} className="flex items-center justify-between">
                  <span
                    className={`text-sm ${
                      included ? "text-[#c0c4d0]" : "text-[#3a3f52]"
                    }`}
                  >
                    {feature.label}
                  </span>
                  {included ? (
                    <Check
                      className="h-4 w-4 text-[#e8614d] shrink-0"
                      strokeWidth={2.5}
                    />
                  ) : (
                    <Minus className="h-4 w-4 text-[#3a3f52] shrink-0" />
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
