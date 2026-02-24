"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useSession } from "@/lib/better-auth/auth-client";
import { useRouter } from "next/navigation";
import { appRouter } from "@/lib/constants/appRouter";
import SignInModal from "@/components/SignInModal";
import AnimatedSection from "@/components/sections/AnimatedSection";

export default function FinalCTASection() {
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
    <section className="py-20 md:py-28 px-6">
      <div className="container mx-auto">
        <div className="mx-auto max-w-4xl">
          <AnimatedSection>
            <div className="bg-lavender rounded-[2rem] p-12 md:p-20 text-center">
              <h2 className="font-serif text-4xl md:text-5xl font-bold mb-5">
                Ready to Stop Juggling
                <br />
                13 Different Apps?
              </h2>
              <p className="text-foreground/70 text-lg mb-10 max-w-lg mx-auto">
                Your AI content manager is one click away. Setup takes less than
                2 minutes.
              </p>
              <Button
                size="lg"
                onClick={handleGetStarted}
                className="text-base px-10 h-14"
              >
                Get Started — $39/mo
              </Button>
              <p className="mt-5 text-sm text-foreground/50">
                Cancel anytime. No contracts.
              </p>
            </div>
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
