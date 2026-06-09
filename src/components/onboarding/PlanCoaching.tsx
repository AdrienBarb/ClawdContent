"use client";

import { ArrowUpRightIcon, ProhibitIcon } from "@phosphor-icons/react";

/** A compact strategist's coaching line: what to lean into vs. stop doing. */
export default function PlanCoaching({
  doubleDown,
  stop,
}: {
  doubleDown: string[];
  stop: string[];
}) {
  const lean = doubleDown.slice(0, 2);
  const drop = stop.slice(0, 1);
  if (lean.length === 0 && drop.length === 0) return null;

  return (
    <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5">
      {lean.length > 0 && (
        <div className="flex items-start gap-2.5">
          <ArrowUpRightIcon
            className="mt-0.5 h-4 w-4 shrink-0 text-gray-500"
            weight="bold"
            aria-hidden
          />
          <p className="text-[13px] leading-relaxed text-gray-700">
            <span className="font-semibold text-gray-900">Lean into</span> —{" "}
            {lean.join("; ")}
          </p>
        </div>
      )}
      {drop.length > 0 && (
        <div className="flex items-start gap-2.5">
          <ProhibitIcon
            className="mt-0.5 h-4 w-4 shrink-0 text-gray-400"
            aria-hidden
          />
          <p className="text-[13px] leading-relaxed text-gray-700">
            <span className="font-semibold text-gray-900">Stop</span> —{" "}
            {drop.join("; ")}
          </p>
        </div>
      )}
    </div>
  );
}
