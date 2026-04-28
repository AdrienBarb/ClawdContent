"use client";

import { useState } from "react";
import { useSession } from "@/lib/better-auth/auth-client";
import { useRouter } from "next/navigation";
import { appRouter } from "@/lib/constants/appRouter";
import SignInModal from "@/components/SignInModal";

const features = [
  "Unlimited posts across 9 platforms",
  "Learns your voice, your offer, your brand",
  "Auto-scheduling at peak times",
  "Approve from your phone in seconds",
  "Adapts each post for each platform",
  "Real human support, not a chatbot",
  "Cancel anytime",
];

export default function PricingSection() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);

  const handleGetStarted = () => {
    if (session?.user) {
      router.push(appRouter.dashboard);
      return;
    }
    setIsSignInModalOpen(true);
  };

  return (
    <section id="pricing" className="bg-[#0f1029] px-6 py-24 text-white md:px-14 md:py-32">
      <div className="mx-auto max-w-[1100px]">
        <div className="mb-14 text-center">
          <div className="mb-5 text-[11px] uppercase tracking-[0.18em] text-[#f8a594]">
            Pricing
          </div>
          <h2 className="font-display text-4xl leading-none tracking-[-0.025em] text-balance md:text-6xl lg:text-[80px]">
            One plan.{" "}
            <em className="italic text-[#ec6f5b]">Less than your phone bill.</em>
          </h2>
          <p className="mt-5 text-base text-[#b9bdd6] md:text-[17px]">
            An agency runs $2,000/mo. Yours is $49.
          </p>
        </div>

        <div className="grid grid-cols-1 items-center gap-10 rounded-[32px] border border-[#2a2d52] bg-[#191b3a] p-8 md:grid-cols-2 md:gap-14 md:p-14">
          <div>
            <div className="mb-6 inline-block rounded-full bg-[#ec6f5b22] px-3.5 py-1.5 text-xs tracking-[0.05em] text-[#f8a594]">
              Save 30% yearly
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-6xl font-semibold leading-none tracking-[-0.04em] text-white md:text-7xl">
                $49
              </span>
              <span className="text-base text-[#7a7fa0] md:text-lg">/month</span>
            </div>
            <p className="mt-4 max-w-[380px] text-sm leading-[1.55] text-[#b9bdd6] md:text-base">
              Or $34/mo billed yearly. Everything included. Cancel anytime, two clicks.
            </p>
            <button
              onClick={handleGetStarted}
              className="mt-8 cursor-pointer rounded-full bg-[#ec6f5b] px-8 py-4 text-sm font-semibold text-white shadow-[0_14px_40px_-10px_#ec6f5b] transition-transform hover:-translate-y-0.5"
            >
              Get my 5 free posts →
            </button>
            <div className="mt-3 text-xs text-[#7a7fa0]">
              5 free posts. No credit card.
            </div>
          </div>

          <ul className="m-0 grid list-none gap-3.5 p-0 text-[15px]">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-3 text-white">
                <span className="grid h-5 w-5 flex-shrink-0 place-items-center rounded-full bg-[#ec6f5b] text-[11px] text-white">
                  ✓
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <SignInModal open={isSignInModalOpen} onOpenChange={setIsSignInModalOpen} />
    </section>
  );
}
