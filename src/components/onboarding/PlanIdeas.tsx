"use client";

import type { PlanIdea } from "@/lib/schemas/onboardingPlan";

/** A few concrete, business-specific post ideas — proof the plan is bespoke. */
export default function PlanIdeas({ ideas }: { ideas: PlanIdea[] }) {
  if (ideas.length === 0) return null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <h3 className="mb-3 text-sm font-semibold tracking-tight text-gray-900">
        Ideas we&apos;ll turn into your first posts
      </h3>
      <ul className="space-y-3">
        {ideas.map((idea, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span className="mt-px shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10.5px] font-medium text-gray-600">
              {idea.formatLabel}
            </span>
            <span className="text-[13px] leading-relaxed text-gray-700">
              {idea.idea}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
