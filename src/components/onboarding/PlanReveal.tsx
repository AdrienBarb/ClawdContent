"use client";

import type { PaywallPlan } from "@/lib/schemas/onboardingPlan";
import PlanDelta from "./PlanDelta";
import PlanPillars from "./PlanPillars";
import PlanIdeas from "./PlanIdeas";
import PlanCoaching from "./PlanCoaching";

/**
 * The "aha" reveal: an honest "before" diagnosis next to the specific plan
 * we've already written for this account, framed around the user's goal. Sits
 * above the trial CTA on the final onboarding step.
 */
export default function PlanReveal({ plan }: { plan: PaywallPlan }) {
  const { after, before, goalLabel, dataQuality } = plan;

  if (!after) return null; // caller guards; defensive

  const who = plan.account.handle
    ? `@${plan.account.handle}`
    : (plan.businessName ?? "your account");

  const isFresh =
    dataQuality === "cold_start" || dataQuality === "platform_no_history";

  const lead = isFresh
    ? `You're just getting started${
        goalLabel ? ` — here's your plan to ${goalLabel}` : " — here's your plan"
      }.`
    : `Today you're ${before.diagnosis.slice(0, 2).join(", ")}.${
        goalLabel ? ` Here's the plan to ${goalLabel}.` : ""
      }`;

  return (
    <div className="space-y-3">
      <header className="text-center">
        <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-gray-400">
          Your plan is ready
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Here&apos;s what we&apos;ll do for {who}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-500">
          {lead}
        </p>
      </header>

      <PlanDelta before={before} after={after} />
      <PlanPillars pillars={after.pillars} />
      <PlanIdeas ideas={after.ideas} />
      <PlanCoaching doubleDown={after.doubleDown} stop={after.stop} />
    </div>
  );
}
