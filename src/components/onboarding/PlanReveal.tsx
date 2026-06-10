"use client";

import type { PaywallPlan } from "@/lib/schemas/onboardingPlan";
import PlanDelta from "./PlanDelta";
import PlanPositioning from "./PlanPositioning";
import PlanPillars from "./PlanPillars";
import PlanFormats from "./PlanFormats";
import PlanCoaching from "./PlanCoaching";

/**
 * The "aha" reveal: a clear before/after, then the strategy we've already
 * written for this account — angle, themes, cadence & format plan, and what
 * we'll lean into. Sits above the subscribe CTA on the final onboarding step.
 */
export default function PlanReveal({ plan }: { plan: PaywallPlan }) {
  const { after, before } = plan;

  if (!after) return null; // caller guards; defensive

  const who = plan.account.handle
    ? `@${plan.account.handle}`
    : (plan.businessName ?? "your account");

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

      <PlanDelta before={before} after={after} />
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
