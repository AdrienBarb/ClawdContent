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
            <div className="rounded-[2rem] border border-[#e8614d]/20 bg-gradient-to-br from-[#1a1020] to-[#0d0f17] p-12 md:p-20 text-center">
              <h2 className="text-4xl md:text-5xl font-bold mb-5 text-white">
                Ready to Stop Juggling
                <br />
                13 Different Apps?
              </h2>
              <p className="text-[#7a7f94] text-lg mb-10 max-w-lg mx-auto">
                Your AI content manager is one click away. Setup takes less than
                2 minutes.
              </p>
              <Button
                size="lg"
                onClick={handleGetStarted}
                className="text-base px-10 h-14 bg-[#e8614d] hover:bg-[#d4563f] text-white"
              >
                Get Started — $39/mo
              </Button>
              <p className="mt-5 text-sm text-[#555a6b]">
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
