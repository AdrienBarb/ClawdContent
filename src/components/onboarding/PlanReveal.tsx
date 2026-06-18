"use client";

import type { PaywallPlan } from "@/lib/schemas/onboardingPlan";
import PlanPositioning from "./PlanPositioning";
import PlanPillars from "./PlanPillars";
import PlanFormats from "./PlanFormats";
import PlanCoaching from "./PlanCoaching";

/**
 * The "aha" reveal: the brand-level strategy we've already written — angle,
 * themes, cadence & format plan, and what we'll lean into. Strategy-only (no
 * before/after). Sits above the subscribe CTA on the final onboarding step.
 */
export default function PlanReveal({ plan }: { plan: PaywallPlan }) {
  const { after } = plan;

  if (!after) return null; // caller guards; defensive

  // Brand-level reveal: lead with the business name, fall back to the connected
  // handle, then a neutral phrase.
  const who = plan.businessName
    ? plan.businessName
    : plan.account?.handle
      ? `@${plan.account.handle}`
      : "your business";

  return (
    <div className="space-y-4">
      <header>
        <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-gray-400">
          Your plan is ready
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Here&apos;s the plan for {who}
        </h1>
        {after.summary ? (
          <p className="mt-2 text-sm leading-relaxed text-gray-500">
            {after.summary}
          </p>
        ) : null}
      </header>

      <PlanPositioning positioning={after.positioning} />
      <PlanPillars pillars={after.pillars} />
      <PlanFormats
        postsPerWeek={after.postsPerWeek}
        cadenceRationale={after.cadenceRationale}
        formatPlan={after.formatPlan}
      />
      <PlanCoaching doubleDown={after.doubleDown} stop={after.stop} />
    </div>
  );
}
