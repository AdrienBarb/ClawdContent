"use client";

import type {
  PaywallPlanAfter,
  PaywallPlanBefore,
} from "@/lib/schemas/onboardingPlan";
import { cadencePhrase } from "./planText";

/**
 * The hero of the reveal: two columns the owner reads top to bottom. The left
 * is where they are today; the right is where we'll take them. Same three
 * levers in each column (how often, what, and a plan) so the lift is obvious.
 */
export default function PlanDelta({
  before,
  after,
}: {
  before: PaywallPlanBefore;
  after: PaywallPlanAfter;
}) {
  const beforeCadence =
    before.postsPerWeek === null
      ? "Not posting yet"
      : before.postsPerWeek < 1
        ? "Less than once a week"
        : cadencePhrase(before.postsPerWeek);

  const beforeFormats =
    before.topFormatLabel === null
      ? "No posts yet"
      : before.hasReels
        ? before.topFormatLabel
        : `${before.topFormatLabel} only`;

  const afterFormats = after.targetFormatLabels.join(", ") || "A balanced mix";

  const rows = [
    { before: beforeCadence, after: cadencePhrase(after.postsPerWeek) },
    { before: beforeFormats, after: afterFormats },
    {
      before: "No clear plan",
      after:
        after.pillars.length > 0
          ? `${after.pillars.length} content themes`
          : "A clear content plan",
    },
  ];

  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-gray-200">
      {/* Where they are now */}
      <div className="bg-gray-50/60 p-4">
        <p className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-gray-400">
          Where you are now
        </p>
        <ul className="space-y-2.5">
          {rows.map((row, i) => (
            <li key={i} className="text-[13px] leading-snug text-gray-500">
              {row.before}
            </li>
          ))}
        </ul>
      </div>

      {/* Where we'll take them */}
      <div className="border-l border-gray-200 bg-white p-4">
        <p className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-gray-400">
          Where we&apos;ll take you
        </p>
        <ul className="space-y-2.5">
          {rows.map((row, i) => (
            <li
              key={i}
              className="text-[13px] font-semibold leading-snug tabular-nums text-gray-900"
            >
              {row.after}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
