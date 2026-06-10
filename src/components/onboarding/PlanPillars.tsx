"use client";

import type { PlanPillar } from "@/lib/schemas/onboardingPlan";

/** The recurring content themes we'll rotate, as a single card of rows. */
export default function PlanPillars({ pillars }: { pillars: PlanPillar[] }) {
  if (pillars.length === 0) return null;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4">
      <p className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-gray-400">
        Content themes
      </p>
      <ul>
        {pillars.map((pillar, i) => (
          <li
            key={`${pillar.name}-${i}`}
            className="border-b border-gray-50 py-3 first:pt-0 last:border-0 last:pb-0"
          >
            <p className="text-[13px] font-semibold text-gray-900">
              {pillar.name}
            </p>
            {pillar.description ? (
              <p className="mt-0.5 text-[12px] leading-relaxed text-gray-500">
                {pillar.description}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
