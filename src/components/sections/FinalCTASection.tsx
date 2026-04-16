"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useSession } from "@/lib/better-auth/auth-client";
import { useRouter } from "next/navigation";
import { appRouter } from "@/lib/constants/appRouter";
import SignInModal from "@/components/SignInModal";

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
          <div className="rounded-[2rem] border border-[#1e293b] bg-gradient-to-br from-[#0f172a] to-[#1e293b] p-12 md:p-20 text-center">
              <h2 className="text-4xl md:text-5xl font-bold mb-5 text-white leading-tight">
                Every day without PostClaw is another day of copy-pasting,
                rewriting, and staring at blank editors.
              </h2>
              <p className="text-[#8e93b0] text-lg mb-10 max-w-lg mx-auto">
                Setup takes 2 minutes. Your AI social media manager starts
                learning your brand immediately.
              </p>
              <Button
                size="lg"
                onClick={handleGetStarted}
                className="text-base px-10 h-14 bg-primary hover:bg-[#E84A36] text-white rounded-full"
              >
                Start posting today
              </Button>
              <p className="mt-5 text-sm text-[#6b7194]">
                Plans from $17/mo. Cancel anytime. No contracts.
              </p>
            </div>
        </div>
      </div>
      <SignInModal
        open={isSignInModalOpen}
        onOpenChange={setIsSignInModalOpen}
      />
    </section>
  );
}
