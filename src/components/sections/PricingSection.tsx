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
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-center mb-4">
              One Plan. No Surprises.
            </h2>
            <p className="text-center text-muted-foreground text-lg mb-6">
              Less than the cost of a single freelance post.
            </p>
          </AnimatedSection>

          <AnimatedSection delay={0.1}>
            <div className="text-center mb-10 space-y-1.5">
              <p className="text-muted-foreground line-through">
                $2,000+/mo for a social media manager
              </p>
              <p className="text-muted-foreground line-through">
                $200+/mo for 5 different tools
              </p>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.2}>
            <div className="bg-card rounded-3xl p-10 shadow-md">
              <div className="mb-8">
                <span className="inline-block bg-primary/10 text-primary text-xs font-semibold px-4 py-1.5 rounded-full mb-5">
                  All-inclusive
                </span>
                <h3 className="font-serif text-2xl font-bold mb-3">
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="font-serif text-6xl font-bold text-primary">
                    {plan.price}
                  </span>
                  <span className="text-muted-foreground text-lg">
                    {plan.period}
                  </span>
                </div>
                <p className="text-muted-foreground">{plan.description}</p>
              </div>
              <ul className="space-y-3.5 mb-10">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 mt-0.5 shrink-0">
                      <Check className="h-3 w-3 text-primary" strokeWidth={3} />
                    </div>
                    <span className="text-[0.95rem]">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="w-full text-base h-14"
                size="lg"
                onClick={handleGetStarted}
              >
                Get Started — $39/mo
              </Button>
              <p className="text-center text-sm text-muted-foreground mt-5">
                Cancel anytime. No contracts. No hidden fees.
              </p>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.3}>
            <p className="text-center text-xs text-muted-foreground mt-8">
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
