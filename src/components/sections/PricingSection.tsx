"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { useState } from "react";
import { useSession } from "@/lib/better-auth/auth-client";
import { useRouter } from "next/navigation";
import config from "@/lib/config";
import { appRouter } from "@/lib/constants/appRouter";
import useApi from "@/lib/hooks/useApi";
import AnimatedSection from "@/components/sections/AnimatedSection";

export default function PricingSection() {
  const { data: session } = useSession();
  const router = useRouter();
  const { usePost } = useApi();
  const [isLoading, setIsLoading] = useState(false);

  const { mutate: createCheckout } = usePost(appRouter.api.checkout, {
    onSuccess: (data: { url: string }) => {
      window.location.href = data.url;
    },
    onSettled: () => setIsLoading(false),
  });

  const plan = config.pricing.plan;

  const handleGetStarted = () => {
    if (!session?.user) {
      router.push(appRouter.signin);
      return;
    }
    setIsLoading(true);
    createCheckout({});
  };

  return (
    <section id="pricing" className="container mx-auto px-4 py-20 md:py-24">
      <div className="mx-auto max-w-lg">
        <AnimatedSection>
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">
              One plan. No surprises.
            </h2>
            <p className="text-xl text-muted-foreground">
              Less than the cost of a single freelance post.
            </p>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={0.1}>
          <div className="text-center mb-8 space-y-2">
            <p className="text-lg text-muted-foreground line-through">
              $2,000+/mo for a social media manager
            </p>
            <p className="text-lg text-muted-foreground line-through">
              $200+/mo for 5 different tools
            </p>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={0.2}>
          <div className="p-8 rounded-lg border bg-background shadow-lg">
            <div className="mb-6">
              <Badge className="mb-4">All-inclusive</Badge>
              <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-5xl font-bold text-primary">
                  {plan.price}
                </span>
                <span className="text-muted-foreground">{plan.period}</span>
              </div>
              <p className="text-muted-foreground">{plan.description}</p>
            </div>
            <ul className="space-y-3 mb-8">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
            <Button
              className="w-full text-base py-6"
              size="lg"
              onClick={handleGetStarted}
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : "Get Started — $39/mo"}
            </Button>
            <p className="text-center text-sm text-muted-foreground mt-4">
              Cancel anytime. No contracts. No hidden fees.
            </p>
            <p className="text-center text-xs text-muted-foreground mt-6">
              Powered by OpenClaw, the open-source AI agent with 140K+ GitHub
              stars
            </p>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
