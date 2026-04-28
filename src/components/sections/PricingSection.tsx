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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
            A social media manager costs $2,000/mo. Yours is $49.
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-4 text-foreground">
            Simple, Transparent Pricing
          </h2>
          <p className="text-center text-secondary-foreground text-lg mb-10">
            One plan. Everything included. No surprises.
          </p>

          <PricingCards onSelectPlan={handleSelectPlan} />
        </div>
      </div>
      <SignInModal
        open={isSignInModalOpen}
        onOpenChange={setIsSignInModalOpen}
      />
    </section>
  );
}
