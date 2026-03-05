"use client";

import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useState } from "react";
import { useSession } from "@/lib/better-auth/auth-client";
import { useRouter } from "next/navigation";
import config from "@/lib/config";
import { appRouter } from "@/lib/constants/appRouter";
import SignInModal from "@/components/SignInModal";
import AnimatedSection from "@/components/sections/AnimatedSection";

export default function PricingSection() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);

  const plan = config.pricing.plan;

  const handleGetStarted = () => {
    if (session?.user) {
      router.push(appRouter.dashboard);
      return;
    }
    setIsSignInModalOpen(true);
  };

  return (
    <section id="pricing" className="py-20 md:py-28">
      <div className="container mx-auto px-6">
        <div className="mx-auto max-w-lg">
          <AnimatedSection>
            <h2 className="text-4xl md:text-5xl font-bold text-center mb-4 text-white">
              One Plan. No Surprises.
            </h2>
            <p className="text-center text-[#7a7f94] text-lg mb-6">
              Less than the cost of a single freelance post.
            </p>
          </AnimatedSection>

          <AnimatedSection delay={0.1}>
            <div className="text-center mb-10 space-y-1.5">
              <p className="text-[#555a6b] line-through">
                $2,000+/mo for a social media manager
              </p>
              <p className="text-[#555a6b] line-through">
                $200+/mo for 5 different tools
              </p>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.2}>
            <div className="bg-[#151929] border border-[#1e2233] rounded-3xl p-10">
              <div className="mb-8">
                <span className="inline-block bg-[#e8614d]/10 text-[#e8614d] text-xs font-semibold px-4 py-1.5 rounded-full mb-5">
                  All-inclusive
                </span>
                <h3 className="text-2xl font-bold mb-3 text-white">
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-3xl font-bold text-[#555a6b] line-through">
                    $49
                  </span>
                  <span className="text-6xl font-bold text-[#e8614d]">
                    {plan.price}
                  </span>
                  <span className="text-[#7a7f94] text-lg">
                    {plan.period}
                  </span>
                </div>
                <p className="text-[#7a7f94]">{plan.description}</p>
              </div>
              <ul className="space-y-3.5 mb-10">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#e8614d]/10 mt-0.5 shrink-0">
                      <Check className="h-3 w-3 text-[#e8614d]" strokeWidth={3} />
                    </div>
                    <span className="text-[0.95rem] text-[#c0c4d0]">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="w-full text-base h-14 bg-[#e8614d] hover:bg-[#d4563f] text-white"
                size="lg"
                onClick={handleGetStarted}
              >
                Get Started
              </Button>
              <p className="text-center text-sm text-[#555a6b] mt-5">
                $29/mo. Cancel anytime. No contracts. No hidden fees.
              </p>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.3}>
            <p className="text-center text-xs text-[#555a6b] mt-8">
              Powered by OpenClaw, the open-source AI agent with 140K+ GitHub
              stars
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
