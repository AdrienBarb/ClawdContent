"use client";

import type React from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  SpinnerGapIcon,
} from "@phosphor-icons/react";

/** Ordered step labels — the single source for the progress stepper. */
export const ONBOARDING_STEPS = [
  { label: "Website" },
  { label: "Connect" },
  { label: "Goal" },
  { label: "Business" },
  { label: "Brand" },
  { label: "Your plan" },
] as const;

export const TOTAL_STEPS = ONBOARDING_STEPS.length;

const CORAL_FILL = "linear-gradient(90deg, #ec6f5b 0%, #c84a35 100%)";

// Primary CTA — coral gradient per the dashboard design system.
const PRIMARY_BTN =
  "inline-flex items-center justify-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-[filter,transform] hover:brightness-[1.03] active:translate-y-px disabled:pointer-events-none disabled:opacity-50";
const PRIMARY_STYLE: React.CSSProperties = {
  background: "linear-gradient(180deg, #ec6f5b 0%, #c84a35 100%)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 2px rgba(200,74,53,0.25)",
};

export interface OnboardingShellProps {
  /** 1-based step index — drives the progress stepper. */
  step: number;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Omit to hide Back (kept invisible so the footer never shifts). */
  onBack?: () => void;
  ctaLabel: string;
  /** Label shown next to the spinner while submitting (defaults to ctaLabel). */
  submittingLabel?: string;
  onSubmit: () => void;
  /** Render the card as a <form> so Enter submits and the CTA is type="submit". */
  asForm?: boolean;
  ctaDisabled?: boolean;
  isSubmitting?: boolean;
  /** Show the trailing arrow on the CTA (false on terminal/action steps). */
  ctaArrow?: boolean;
}

/**
 * The single frame every onboarding step renders into: a fixed-height card with
 * a persistent progress stepper, an optional title/subtitle header, ONE
 * scrollable body (tall steps scroll here — the frame never resizes), and a
 * persistent footer (Back · CTA). Steps own only their body + a little config,
 * so every screen shares the exact same layout, height, and CTA position.
 */
export default function OnboardingShell({
  step,
  title,
  subtitle,
  children,
  onBack,
  ctaLabel,
  submittingLabel,
  onSubmit,
  asForm = false,
  ctaDisabled = false,
  isSubmitting = false,
  ctaArrow = true,
}: OnboardingShellProps) {
  const hasHeader = Boolean(title || subtitle);

  const cta = (
    <button
      type={asForm ? "submit" : "button"}
      onClick={asForm ? undefined : onSubmit}
      disabled={ctaDisabled || isSubmitting}
      className={PRIMARY_BTN}
      style={PRIMARY_STYLE}
    >
      {isSubmitting ? (
        <>
          <SpinnerGapIcon className="h-4 w-4 animate-spin" />
          {submittingLabel ?? ctaLabel}
        </>
      ) : (
        <>
          {ctaLabel}
          {ctaArrow && <ArrowRightIcon className="h-4 w-4" />}
        </>
      )}
    </button>
  );

  const inner = (
    <>
      {/* Progress stepper */}
      <div className="px-8 pt-6">
        <div className="flex gap-1.5">
          {ONBOARDING_STEPS.map((_, i) => {
            const filled = i + 1 <= step;
            return (
              <span
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  filled ? "" : "bg-gray-200"
                }`}
                style={filled ? { backgroundImage: CORAL_FILL } : undefined}
              />
            );
          })}
        </div>
      </div>

      {/* Header */}
      {hasHeader && (
        <div className="px-8 pt-6">
          {title && (
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="mt-2 text-[14px] leading-relaxed text-gray-500">
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* Body — the only scroll region; tall steps scroll, frame stays fixed */}
      <div
        className={`min-h-0 flex-1 overflow-y-auto px-8 pb-6 ${
          hasHeader ? "pt-4" : "pt-6"
        }`}
      >
        {children}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-8 py-4">
        <button
          type="button"
          onClick={onBack}
          className={`flex items-center gap-1.5 text-[13.5px] text-gray-500 transition-colors hover:text-gray-700 ${
            onBack ? "cursor-pointer" : "invisible"
          }`}
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back
        </button>
        <div className="flex items-center gap-3">{cta}</div>
      </div>
    </>
  );

  const cardClass =
    "flex w-full max-w-[600px] flex-col overflow-hidden bg-white h-[100dvh] sm:h-[700px] sm:max-h-[calc(100dvh_-_4rem)] sm:rounded-2xl sm:border sm:border-gray-200 sm:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_18px_40px_-16px_rgba(45,42,37,0.20)]";

  if (asForm) {
    return (
      <form
        className={cardClass}
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        {inner}
      </form>
    );
  }
  return <div className={cardClass}>{inner}</div>;
}
