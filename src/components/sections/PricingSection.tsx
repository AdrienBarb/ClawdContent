"use client";

import { useState } from "react";
import { useSession } from "@/lib/better-auth/auth-client";
import { useRouter } from "next/navigation";
import { appRouter } from "@/lib/constants/appRouter";
import SignInModal from "@/components/SignInModal";
import AnimatedSection from "@/components/sections/AnimatedSection";
import PricingCards from "@/components/PricingCards";
import type { PlanId, BillingInterval } from "@/lib/constants/plans";

export default function PricingSection() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);

  const handleSelectPlan = (_planId: PlanId, _interval: BillingInterval) => {
    if (session?.user) {
      router.push(appRouter.dashboard);
      return;
    }
    setIsSignInModalOpen(true);
  };

  return (
    <section id="pricing" className="py-20 md:py-28">
      <div className="container mx-auto px-6">
        <div className="mx-auto max-w-5xl">
          <AnimatedSection>
            <h2 className="text-4xl md:text-5xl font-bold text-center mb-4 text-white">
              Simple, Transparent Pricing
            </h2>
            <p className="text-center text-[#7a7f94] text-lg mb-10">
              Choose the plan that fits your needs. Upgrade or downgrade
              anytime.
            </p>
          </AnimatedSection>

          <AnimatedSection delay={0.1}>
            <PricingCards onSelectPlan={handleSelectPlan} />
          </AnimatedSection>

          <AnimatedSection delay={0.2}>
            <p className="text-center text-xs text-[#555a6b] mt-8">
              Powered by open-source AI technology
            </p>
          </AnimatedSection>
        </div>
      </div>
      <SignInModal
        open={isSignInModalOpen}
        onOpenChange={setIsSignInModalOpen}
      />
    </section>
  );
}
