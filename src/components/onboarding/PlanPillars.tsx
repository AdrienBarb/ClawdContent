"use client";

import type { PlanPillar } from "@/lib/schemas/onboardingPlan";

/** The recurring content themes we'll rotate — rooted in their business + goal. */
export default function PlanPillars({ pillars }: { pillars: PlanPillar[] }) {
  const shown = pillars.slice(0, 3);
  if (shown.length === 0) return null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <h3 className="mb-3 text-sm font-semibold tracking-tight text-gray-900">
        Your content themes
      </h3>
      <ul className="space-y-2.5">
        {shown.map((pillar) => (
          <li key={pillar.name} className="flex gap-2.5">
            <span
              className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300"
              aria-hidden
            />
            <p className="text-[13px] leading-relaxed text-gray-600">
              <span className="font-medium text-gray-900">{pillar.name}</span>
              {pillar.description ? (
                <span className="text-gray-500"> — {pillar.description}</span>
              ) : null}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
