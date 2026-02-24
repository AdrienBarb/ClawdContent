"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useSession } from "@/lib/better-auth/auth-client";
import { useRouter } from "next/navigation";
import { appRouter } from "@/lib/constants/appRouter";
import useApi from "@/lib/hooks/useApi";
import AnimatedSection from "@/components/sections/AnimatedSection";

export default function FinalCTASection() {
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

  const handleGetStarted = () => {
    if (!session?.user) {
      router.push(appRouter.signin);
      return;
    }
    setIsLoading(true);
    createCheckout({});
  };

  return (
    <section className="bg-primary py-20 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <AnimatedSection>
            <h2 className="text-4xl font-bold mb-4 text-primary-foreground">
              Ready to stop juggling 13 different apps?
            </h2>
            <p className="text-xl text-primary-foreground/80 mb-8">
              Your AI content manager is one click away.
            </p>
            <Button
              size="lg"
              variant="secondary"
              onClick={handleGetStarted}
              disabled={isLoading}
              className="text-base px-8 py-6"
            >
              {isLoading ? "Loading..." : "Get Started — $39/mo"}
            </Button>
            <p className="mt-4 text-sm text-primary-foreground/60">
              Setup takes less than 2 minutes. Cancel anytime.
            </p>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
