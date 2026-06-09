"use client";

import { ArrowRightIcon } from "@phosphor-icons/react";
import type {
  PaywallPlanAfter,
  PaywallPlanBefore,
} from "@/lib/schemas/onboardingPlan";

/**
 * The hero of the reveal: a "Today → With PostClaw" delta across the three
 * levers that matter — cadence, formats, and a real content plan.
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
        ? "<1× / week"
        : `${before.postsPerWeek}× / week`;

  const beforeFormats =
    before.topFormatLabel === null
      ? "No posts yet"
      : before.hasReels
        ? before.topFormatLabel
        : `${before.topFormatLabel} only`;

  const rows = [
    { before: beforeCadence, after: `${after.postsPerWeek}× / week` },
    {
      before: beforeFormats,
      after: after.targetFormatLabels.join(" · ") || "A balanced mix",
    },
    { before: "No clear plan", after: `${after.pillars.length} content themes` },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="grid grid-cols-[1fr_28px_1fr] items-center gap-x-2 pb-1">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-gray-400">
          Today
        </span>
        <span aria-hidden />
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-primary">
          With PostClaw
        </span>
      </div>
      {rows.map((row, i) => (
        <div
          key={i}
          className="grid grid-cols-[1fr_28px_1fr] items-center gap-x-2 border-t border-gray-100 py-3"
        >
          <span className="text-sm text-gray-400">{row.before}</span>
          <ArrowRightIcon
            className="h-4 w-4 justify-self-center text-gray-300"
            weight="bold"
            aria-hidden
          />
          <span className="text-sm font-semibold text-gray-900 tabular-nums">
            {row.after}
          </span>
        </div>
      ))}
    </div>
  );
}
