"use client";

import { SlidersIcon } from "@phosphor-icons/react";
import type { PlatformAccount } from "@/components/dashboard/platform/types";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatHour(h: number): string {
  if (h === 0) return "12am";
  if (h === 12) return "12pm";
  if (h < 12) return `${h}am`;
  return `${h - 12}pm`;
}

interface Props {
  account: PlatformAccount;
  cadenceDefault: number;
  onCustomize: () => void;
}

export default function PlatformStrategyCard({
  account,
  cadenceDefault,
  onCustomize,
}: Props) {
  const s = account.strategy;

  if (!s) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[16px] font-semibold text-gray-900">
              Strategy still loading
            </h2>
            <p className="mt-1 max-w-md text-[13px] text-gray-600">
              We&apos;re still studying this account. Your weekly plan will
              appear here in a minute — refresh the page in a bit.
            </p>
          </div>
          <button
            type="button"
            onClick={onCustomize}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[12.5px] font-medium text-gray-700 hover:bg-gray-50"
          >
            <SlidersIcon size={14} weight="bold" />
            Customize
          </button>
        </div>
      </div>
    );
  }

  const topSlots = [...s.bestTimes]
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
            Strategy
          </h2>
          <p className="mt-1 text-[16px] font-semibold text-gray-900">
            {s.postsPerWeek} {s.postsPerWeek === 1 ? "post" : "posts"} per week
            <span className="ml-2 text-[12px] font-normal text-gray-500">
              (default {cadenceDefault})
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={onCustomize}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[12.5px] font-medium text-gray-700 hover:bg-gray-50"
        >
          <SlidersIcon size={14} weight="bold" />
          Customize
        </button>
      </div>

      <dl className="mt-5 grid gap-5 md:grid-cols-3">
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
            Pillars
          </dt>
          <dd className="mt-2 flex flex-wrap gap-1.5">
            {s.contentPillars.map((p) => (
              <span
                key={p}
                className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-[12px] text-gray-700"
              >
                {p}
              </span>
            ))}
          </dd>
        </div>

        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
            Voice
          </dt>
          <dd className="mt-2 space-y-1">
            {s.voiceRules.map((rule) => (
              <p key={rule} className="text-[12.5px] leading-relaxed text-gray-700">
                · {rule}
              </p>
            ))}
          </dd>
        </div>

        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
            Best times
          </dt>
          <dd className="mt-2 flex flex-wrap gap-1.5">
            {topSlots.map((slot, i) => (
              <span
                key={`${slot.day}-${slot.hour}-${i}`}
                className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-[12px] tabular-nums text-gray-700"
              >
                {DAY_NAMES[slot.day]} {formatHour(slot.hour)}
              </span>
            ))}
          </dd>
        </div>
      </dl>

      {s.imageStyle && (
        <p className="mt-5 border-t border-gray-100 pt-4 text-[12.5px] italic leading-relaxed text-gray-600">
          {s.imageStyle}
        </p>
      )}
    </div>
  );
}
