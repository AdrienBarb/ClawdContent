"use client";

import {
  CalendarBlankIcon,
  LockSimpleIcon,
  PaperPlaneTiltIcon,
  PenNibIcon,
  SpinnerGapIcon,
} from "@phosphor-icons/react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { appRouter } from "@/lib/constants/appRouter";
import useApi from "@/lib/hooks/useApi";

const PERKS = [
  { icon: CalendarBlankIcon, label: "We plan your content week" },
  { icon: PenNibIcon, label: "We write every post in your voice" },
  { icon: PaperPlaneTiltIcon, label: "We publish to your accounts for you" },
];

export default function Step6Paywall() {
  const { usePost } = useApi();

  const { mutate: checkout, isPending: isCheckingOut } = usePost(
    appRouter.api.checkout,
    {
      onSuccess: (data: { url: string }) => {
        window.location.href = data.url;
      },
      onError: (error: Error) =>
        toast.error(error.message || "Couldn't start checkout."),
    }
  );

  const startTrial = () =>
    checkout({
      planId: "pro",
      interval: "monthly",
      successUrl: `${appRouter.onboarding}?stripe_success=1`,
    });

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          We&apos;ll take it from here
        </h1>
        <p className="text-gray-500 mt-2">
          We&apos;ve learned your business and how you sound. Start your free
          trial and we&apos;ll plan, write, and publish your posts for you.
        </p>
      </div>

      <div className="space-y-3">
        {PERKS.map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
              <Icon className="h-5 w-5" />
            </span>
            <span className="text-sm text-gray-800">{label}</span>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 text-center">
        <div className="flex items-center justify-center gap-1.5 text-sm font-medium text-gray-900">
          <LockSimpleIcon className="h-4 w-4 text-[#e8614d]" />
          Start your 3-day free trial
        </div>
        <p className="mt-1 text-xs text-gray-500">
          $49/mo after your trial. Cancel anytime.
        </p>
        <Button
          type="button"
          className="mt-4 w-full bg-primary hover:bg-[#E84A36] text-white"
          disabled={isCheckingOut}
          onClick={startTrial}
        >
          {isCheckingOut ? (
            <>
              <SpinnerGapIcon className="h-4 w-4 mr-1.5 animate-spin" />
              Redirecting…
            </>
          ) : (
            "Start your 3-day free trial"
          )}
        </Button>
      </div>
    </div>
  );
}
