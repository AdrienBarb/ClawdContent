"use client";

import type {
  FormatAction,
  PlanFormatItem,
} from "@/lib/schemas/onboardingPlan";
import { cadencePhrase } from "./planText";

interface Props {
  postsPerWeek: number;
  cadenceRationale: string;
  formatPlan: PlanFormatItem[];
}

// Friendly, scannable labels for the strategy's format actions.
const ACTION_LABEL: Record<FormatAction, string> = {
  start: "Start",
  increase: "More",
  maintain: "Keep",
  reduce: "Less",
};

/** The cadence target + per-format plan: what to start, do more of, keep, ease off. */
export default function PlanFormats({
  postsPerWeek,
  cadenceRationale,
  formatPlan,
}: Props) {
  if (formatPlan.length === 0) return null;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4">
      <p className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-gray-400">
        Cadence &amp; formats
      </p>

      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-b border-gray-50 pb-3">
        <span className="text-base font-semibold tabular-nums text-gray-900">
          {cadencePhrase(postsPerWeek)}
        </span>
        {cadenceRationale ? (
          <span className="text-[12px] leading-snug text-gray-500">
            {cadenceRationale}
          </span>
        ) : null}
      </div>

      <ul>
        {formatPlan.map((f) => (
          <li
            key={f.format}
            className="border-b border-gray-50 py-3 last:border-0 last:pb-0"
          >
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-gray-900">
                {f.label}
              </span>
              <span className="rounded-full border border-gray-200 bg-white px-2 py-px text-[11px] font-medium text-gray-500">
                {ACTION_LABEL[f.action]}
              </span>
            </div>
            {f.rationale ? (
              <p className="mt-1 text-[12px] leading-relaxed text-gray-500">
                {f.rationale}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
