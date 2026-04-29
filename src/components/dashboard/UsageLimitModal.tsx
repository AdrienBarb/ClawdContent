"use client";

import { useState } from "react";
import {
  XIcon,
  SparkleIcon,
  CheckIcon,
  CircleNotchIcon,
} from "@phosphor-icons/react";
import { useUsageModalStore } from "@/lib/stores/usageModalStore";
import { TOPUP_PACK_PRICE_USD } from "@/lib/constants/usage";

function formatResetAt(iso: string | null): string {
  if (!iso) return "next billing cycle";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
    });
  } catch {
    return "next billing cycle";
  }
}

export default function UsageLimitModal() {
  const payload = useUsageModalStore((s) => s.payload);
  const close = useUsageModalStore((s) => s.close);
  const [busy, setBusy] = useState(false);

  if (!payload) return null;

  const isPaid = payload.isPaid;

  async function handleUpgrade() {
    setBusy(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: "pro", interval: "monthly" }),
      });
      const json = (await res.json()) as { url?: string };
      if (json.url) window.location.href = json.url;
    } finally {
      setBusy(false);
    }
  }

  async function handleTopup() {
    setBusy(true);
    try {
      const res = await fetch("/api/billing/topup", { method: "POST" });
      const json = (await res.json()) as { url?: string };
      if (json.url) window.location.href = json.url;
    } finally {
      setBusy(false);
    }
  }

  const proFeatures = [
    "Plan a full month of posts across every channel",
    "Polish and rewrite drafts as much as you need",
    "Unlimited publishing & scheduling",
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 px-4">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl">
        <button
          onClick={close}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <XIcon className="h-5 w-5" weight="bold" />
        </button>

        <div className="p-8">
          <span
            className="inline-flex h-12 w-12 items-center justify-center rounded-2xl mb-5"
            style={{ backgroundColor: "#fef2f0" }}
          >
            <SparkleIcon
              className="h-6 w-6"
              weight="fill"
              style={{ color: "#e8614d" }}
            />
          </span>

          {!isPaid ? (
            <>
              <h2 className="text-xl font-semibold tracking-tight text-gray-900 mb-1">
                You&apos;ve used your free allowance
              </h2>
              <p className="text-[13px] leading-relaxed text-gray-500 mb-5">
                Upgrade to Pro to keep planning and writing posts.
              </p>

              <ul className="flex flex-col gap-2 mb-6">
                {proFeatures.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2 text-[13px] text-gray-700"
                  >
                    <span
                      className="flex h-4 w-4 items-center justify-center rounded-full"
                      style={{ backgroundColor: "#fef2f0" }}
                    >
                      <CheckIcon
                        className="h-2.5 w-2.5"
                        weight="bold"
                        style={{ color: "#c84a35" }}
                      />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={handleUpgrade}
                disabled={busy}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full font-medium text-white transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed h-11 px-5 text-sm hover:shadow-[0_10px_30px_-10px_rgba(232,97,77,0.55)] hover:-translate-y-0.5"
                style={{
                  background:
                    "linear-gradient(180deg, #ec6f5b 0%, #c84a35 100%)",
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 2px rgba(200,74,53,0.25)",
                }}
              >
                {busy && <CircleNotchIcon className="h-4 w-4 animate-spin" />}
                Upgrade to Pro
              </button>
              <button
                onClick={close}
                className="mt-3 w-full text-center text-[13px] text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
              >
                Maybe later
              </button>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold tracking-tight text-gray-900 mb-1">
                You&apos;ve used this month&apos;s allowance
              </h2>
              <p className="text-[13px] leading-relaxed text-gray-500 mb-5">
                Resets on{" "}
                <span className="font-medium text-gray-700">
                  {formatResetAt(payload.resetAt)}
                </span>
                . Need more right now?
              </p>

              <div className="rounded-xl border border-gray-200 bg-[#faf9f5] p-4 mb-5">
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-[13px] font-semibold text-gray-900">
                    Boost pack
                  </span>
                  <span className="text-[15px] font-semibold tabular-nums text-gray-900">
                    ${TOPUP_PACK_PRICE_USD}
                  </span>
                </div>
                <p className="text-[12px] leading-relaxed text-gray-500">
                  A one-time top-up that never expires.
                </p>
              </div>

              <button
                onClick={handleTopup}
                disabled={busy}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full font-medium text-white transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed h-11 px-5 text-sm hover:shadow-[0_10px_30px_-10px_rgba(232,97,77,0.55)] hover:-translate-y-0.5"
                style={{
                  background:
                    "linear-gradient(180deg, #ec6f5b 0%, #c84a35 100%)",
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 2px rgba(200,74,53,0.25)",
                }}
              >
                {busy && <CircleNotchIcon className="h-4 w-4 animate-spin" />}
                Buy Boost pack — ${TOPUP_PACK_PRICE_USD}
              </button>

              <button
                onClick={close}
                className="mt-3 w-full text-center text-[13px] text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
              >
                Wait until {formatResetAt(payload.resetAt)}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
