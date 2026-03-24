"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useSession } from "@/lib/better-auth/auth-client";
import { useRouter } from "next/navigation";
import { appRouter } from "@/lib/constants/appRouter";
import SignInModal from "@/components/SignInModal";
import AnimatedSection from "@/components/sections/AnimatedSection";
import { PLATFORMS } from "@/lib/constants/platforms";

interface HeroSectionProps {
  variant?: string;
}

export default function HeroSection({ variant = "control" }: HeroSectionProps) {
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
    <section className="hero-dark-glow starfield min-h-[85vh] flex items-center">
      <div className="container mx-auto px-6 py-20 md:py-28">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
          <AnimatedSection>
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-bold leading-[1.1] tracking-tight mb-8 text-white">
              {variant === "test" ? (
                <>
                  A Social Media Manager
                  <br />
                  <span className="text-[#e8614d]">That Costs $17/mo.</span>
                </>
              ) : (
                <>
                  Your Social Media.
                  <br />
                  <span className="text-[#e8614d]">Done in 30 Seconds.</span>
                </>
              )}
            </h1>
          </AnimatedSection>

          <AnimatedSection delay={0.15}>
            <p className="text-lg md:text-xl leading-relaxed text-[#8a8f9e] max-w-2xl mb-10">
              {variant === "test"
                ? "Your AI content manager writes, adapts, and publishes to 13 platforms. Just chat about your ideas — it handles the rest."
                : "PostClaw is your AI content manager. Tell it what you want to say — it writes, adapts, and publishes everywhere."}
            </p>
          </AnimatedSection>

          <AnimatedSection delay={0.3}>
            <Button
              size="lg"
              onClick={handleGetStarted}
              className="text-base px-10 h-14 bg-[#e8614d] hover:bg-[#d4563f] text-white"
            >
              {variant === "test"
                ? "Get Your AI Content Manager"
                : "Start Posting Smarter"}
            </Button>
            <p className="text-sm text-[#555a6b] mt-3">
              {variant === "test"
                ? "Cancel anytime. No contracts."
                : "Plans from $17/mo · Cancel anytime."}
            </p>
          </AnimatedSection>
        </div>
        {/* Platform marquee */}
        <AnimatedSection delay={0.5}>
          <div className="mt-16 md:mt-24 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#0c0f1a] to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#0c0f1a] to-transparent z-10 pointer-events-none" />
            <div className="flex animate-marquee gap-8">
              {[...PLATFORMS, ...PLATFORMS].map((platform, i) => (
                <div
                  key={`${platform.id}-${i}`}
                  className="flex items-center gap-2 shrink-0 rounded-full border border-[#1e2233] bg-[#151929]/60 px-4 py-2"
                >
                  <span style={{ color: platform.color === "#000000" ? "#ffffff" : platform.color }}>
                    {platform.icon}
                  </span>
                  <span className="text-sm text-[#8a8f9e] whitespace-nowrap">
                    {platform.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </div>
      <SignInModal
        open={isSignInModalOpen}
        onOpenChange={setIsSignInModalOpen}
      />
    </section>
  );
}
