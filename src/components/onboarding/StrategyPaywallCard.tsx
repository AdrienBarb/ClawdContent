"use client";

import {
  CardsIcon,
  CheckIcon,
  ImageIcon,
  MonitorPlayIcon,
  SpinnerGapIcon,
} from "@phosphor-icons/react";
import type { PaywallPlanAfter } from "@/lib/schemas/onboardingPlan";

// Coral CTA — gradient + a soft glow that lifts it off the warm card. Shared
// with the timeout fallback button in Step6Paywall.
export const CTA_STYLE = {
  background: "linear-gradient(180deg, #ef7a64 0%, #d4503a 100%)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.22), 0 12px 30px -8px rgba(200,74,53,0.55)",
};

// Shown if the positioning statement ever comes back empty (LLM output isn't
// length-checked) — the hero headline must never render blank.
const FALLBACK_ANGLE = "A growth plan built for your business.";

// Ascending bars in the dark hero — muted brown ramping to bright coral. Pure
// decoration that frames the projected-growth figure.
const BARS = [
  { h: 24, c: "#3a322c" },
  { h: 37, c: "#6e493c" },
  { h: 52, c: "#9c4f3c" },
  { h: 66, c: "#c75a44" },
  { h: 80, c: "#ec6f5b" },
] as const;

// The three formats we lead with, with a one-word promise each. Fixed copy —
// the detailed per-format plan lives in the dashboard, not on the paywall.
const FORMATS = [
  { Icon: MonitorPlayIcon, label: "Reels", note: "Get discovered." },
  { Icon: CardsIcon, label: "Carousels", note: "Win saves." },
  { Icon: ImageIcon, label: "Photos", note: "Show proof." },
] as const;

/**
 * The angle headline is the first sentence of the positioning statement.
 * Falls back to a word-boundary slice when the prose has no terminal
 * punctuation, so a run-on positioning can never balloon the hero into a
 * full paragraph.
 */
function firstSentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const match = trimmed.match(/^.*?[.!?](\s|$)/);
  const sentence = (match ? match[0] : trimmed).trim();
  if (sentence.length <= 120) return sentence;
  return `${sentence.slice(0, 120).replace(/\s+\S*$/, "").trim()}…`;
}

/**
 * The onboarding paywall card: a self-contained reveal of the brand strategy
 * (angle, formats, cadence) wrapped around the subscribe offer. Replaces the
 * shell-framed reveal — it carries its own dark hero + white body and renders
 * only once the strategy is ready, so the user never sees a half-built plan.
 */
export default function StrategyPaywallCard({
  after,
  isDiscount,
  onSubscribe,
  isCheckingOut,
}: {
  after: PaywallPlanAfter;
  isDiscount: boolean;
  onSubscribe: () => void;
  isCheckingOut: boolean;
}) {
  const angle = firstSentence(after.positioning) || FALLBACK_ANGLE;
  // LLM cadence isn't bounds-checked upstream — never render "0×" or a fraction.
  const postsPerWeek = Number.isFinite(after.postsPerWeek)
    ? Math.max(1, Math.round(after.postsPerWeek))
    : 3;
  const priceLabel = isDiscount
    ? "First month, then $99/mo"
    : "A freelancer costs $1,000 to $2,500/mo";

  return (
    <div className="w-full max-w-[540px] rounded-[34px] bg-[#f0ece4] p-2.5 shadow-[0_2px_4px_rgba(45,42,37,0.04),0_24px_60px_-20px_rgba(45,42,37,0.28)]">
      {/* Dark hero — projected growth */}
      <div className="rounded-[26px] bg-[#1a1612] px-6 pb-7 pt-6 text-white">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-[8px] text-[14px] font-bold text-white"
            style={{
              background: "linear-gradient(180deg, #ec6f5b 0%, #c84a35 100%)",
            }}
          >
            P
          </span>
          <span className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#9b8d82]">
            Strategy built for your business
          </span>
        </div>

        <div className="mt-6 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[13.5px] text-[#a99c90]">
              Projected follower growth · 90 days
            </p>
            <p className="mt-1 text-[52px] font-extrabold leading-[0.9] tracking-[-0.02em]">
              +128%
            </p>
          </div>
          <div className="flex h-[80px] shrink-0 items-end gap-[7px]" aria-hidden>
            {BARS.map((bar) => (
              <span
                key={bar.h}
                className="w-[9px] rounded-t-[3px]"
                style={{ height: bar.h, backgroundColor: bar.c }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* White body — strategy + offer */}
      <div className="mt-2.5 rounded-[26px] bg-white px-6 pb-6 pt-7">
        <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#c84a35]">
          Your angle
        </p>
        <h2 className="mt-3 text-[27px] font-bold leading-[1.15] tracking-[-0.02em] text-[#231f1b]">
          {angle}
        </h2>

        <div className="mt-6 grid grid-cols-3 gap-2.5">
          {FORMATS.map(({ Icon, label, note }) => (
            <div key={label} className="rounded-[16px] bg-[#f6f1ea] px-3.5 py-4">
              <Icon className="h-[22px] w-[22px] text-[#ec6f5b]" weight="regular" />
              <p className="mt-3 text-[15px] font-bold text-[#231f1b]">{label}</p>
              <p className="mt-0.5 text-[13px] text-[#8a7c70]">{note}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 flex gap-2.5">
          <div className="flex w-[36%] shrink-0 flex-col justify-center rounded-[18px] bg-[#1a1612] px-4 py-4 text-white">
            <p className="text-[26px] font-extrabold leading-none">
              {postsPerWeek}×{" "}
              <span className="text-[14px] font-semibold text-[#a99c90]">
                /wk
              </span>
            </p>
            <p className="mt-1.5 text-[12.5px] text-[#a99c90]">posting cadence</p>
          </div>
          <div className="flex-1 rounded-[18px] bg-[#f7efe8] px-4 py-3.5">
            <p className="text-[14.5px] leading-snug text-[#3b332c]">
              &ldquo;From 400 to 6k followers in three months. Real leads, not
              just likes.&rdquo;
            </p>
            <p className="mt-2 text-[13px] font-semibold text-[#c84a35]">
              Marine L. · café owner
            </p>
          </div>
        </div>

        <div className="mt-7 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#c84a35]">
            {priceLabel}
          </p>
          <div className="mt-1.5 flex items-end justify-center gap-2">
            {isDiscount && (
              <span className="text-[22px] font-bold leading-none text-[#c3ab9f] line-through">
                $99
              </span>
            )}
            <span className="text-[48px] font-extrabold leading-[0.85] tracking-[-0.02em] text-[#1a1612]">
              {isDiscount ? "$49" : "$99"}
            </span>
            <span className="pb-1 text-[17px] font-medium text-[#a98a7b]">
              /mo
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onSubscribe}
          disabled={isCheckingOut}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-[18px] py-4 text-[16px] font-semibold text-white transition-[filter,transform] hover:brightness-[1.03] active:translate-y-px disabled:pointer-events-none disabled:opacity-60"
          style={CTA_STYLE}
        >
          {isCheckingOut ? (
            <>
              <SpinnerGapIcon className="h-5 w-5 animate-spin" />
              Redirecting…
            </>
          ) : (
            "Activate my plan"
          )}
        </button>

        <div className="mt-4 flex items-center justify-center gap-6">
          {["Cancel anytime", "No contract"].map((f) => (
            <span
              key={f}
              className="flex items-center gap-1.5 text-[14px] font-medium text-[#c84a35]"
            >
              <CheckIcon weight="bold" className="h-[14px] w-[14px]" />
              {f}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
