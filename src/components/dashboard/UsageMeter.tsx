"use client";

import { useDashboardStatus } from "@/lib/hooks/useDashboardStatus";
import { useUsageModalStore } from "@/lib/stores/usageModalStore";
import { LightningIcon } from "@phosphor-icons/react";

// Sidebar usage card. Shows a single percentage of the period budget — never
// raw points or caps — so the metric is stable as new action types ship.
export default function UsageMeter() {
  const { data: status } = useDashboardStatus();
  const open = useUsageModalStore((s) => s.open);

  const usage = status?.usage;
  if (!usage) return null;

  const pct = Math.max(0, Math.min(100, usage.percentageRemaining));
  const isPaid = usage.isPaid;
  const isEmpty = pct === 0;

  const ctaLabel = isPaid ? "Top up" : "Upgrade";

  const openModal = () => {
    open({
      attemptedType: "draft_generation",
      percentageRemaining: usage.percentageRemaining,
      resetAt: usage.resetAt,
      isPaid: usage.isPaid,
    });
  };

  const Wrapper = isEmpty ? "button" : "div";
  const wrapperProps = isEmpty
    ? {
        onClick: openModal,
        className:
          "w-full text-left rounded-lg p-2.5 transition-colors cursor-pointer bg-white shadow-sm hover:bg-black/[0.02]",
      }
    : {
        className: "w-full rounded-lg p-2.5 bg-white shadow-sm",
      };

  return (
    <Wrapper {...wrapperProps}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-700">
          <LightningIcon
            className="h-3 w-3"
            weight="fill"
            style={{ color: "#e8614d" }}
          />
          <span className="tabular-nums">{pct}%</span>
          <span className="text-gray-500 font-normal">remaining</span>
        </span>
        {!isEmpty && (
          <button
            onClick={openModal}
            className="text-[10.5px] font-semibold tracking-[0.02em] uppercase cursor-pointer transition-colors"
            style={{ color: "#c84a35" }}
          >
            {ctaLabel}
          </button>
        )}
      </div>

      <div
        className="h-1 w-full rounded-full overflow-hidden"
        style={{ backgroundColor: "rgba(0,0,0,0.08)" }}
      >
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{
            width: `${pct}%`,
            backgroundColor: isEmpty ? "#9ca3af" : "#e8614d",
          }}
        />
      </div>

      {isEmpty && (
        <p className="mt-1.5 text-[10.5px] text-gray-500">
          {isPaid ? "Tap to top up" : "Tap to upgrade"}
        </p>
      )}
    </Wrapper>
  );
}
