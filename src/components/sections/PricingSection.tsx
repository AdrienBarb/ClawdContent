"use client";

import { useState } from "react";
import { useSession } from "@/lib/better-auth/auth-client";
import { useRouter } from "next/navigation";
import { appRouter } from "@/lib/constants/appRouter";
import SignInModal from "@/components/SignInModal";
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
          <p className="text-center text-sm font-medium text-primary mb-4">
            A social media manager costs $2,000/mo. Yours starts at $17.
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-4 text-foreground">
            Simple, Transparent Pricing
          </h2>
          <p className="text-center text-secondary-foreground text-lg mb-10">
            Choose the plan that fits your needs. Upgrade or downgrade
            anytime.
          </p>

          <PricingCards onSelectPlan={handleSelectPlan} />

          <p className="text-center text-xs text-muted-foreground mt-8">
            Cancel anytime. No contracts.
          </p>
        </div>
      </div>
      <SignInModal
        open={isSignInModalOpen}
        onOpenChange={setIsSignInModalOpen}
      />
    </section>
  );
}
