"use client";

import { SpinnerGapIcon } from "@phosphor-icons/react";

/**
 * Shown while the growth strategy is still being authored (it's generated
 * asynchronously after connect). Resolves into the reveal on its own once the
 * plan lands — no reload needed.
 */
export default function PlanBuilding({ handle }: { handle?: string | null }) {
  return (
    <div
      className="rounded-2xl border border-gray-200 bg-white p-5"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2.5">
        <SpinnerGapIcon
          className="h-4 w-4 shrink-0 animate-spin text-gray-400"
          aria-hidden
        />
        <h3 className="text-sm font-semibold tracking-tight text-gray-900">
          Putting your plan together…
        </h3>
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-gray-500">
        We&apos;re studying {handle ? `@${handle}` : "your account"} and writing
        a plan built around your goal. This usually takes under a minute.
      </p>
    </div>
  );
}
