"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useSession } from "@/lib/better-auth/auth-client";
import { useRouter } from "next/navigation";
import { appRouter } from "@/lib/constants/appRouter";
import SignInModal from "@/components/SignInModal";
import AnimatedSection from "@/components/sections/AnimatedSection";
import Image from "next/image";
import { PLATFORMS } from "@/lib/constants/platforms";

export default function HeroSection() {
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
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          <div className="max-w-3xl lg:max-w-xl flex-shrink-0">
            <AnimatedSection>
              <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-bold leading-[1.1] tracking-tight mb-8 text-white">
                Publish to 13 Platforms.
                <br />
                From <span className="text-[#e8614d]">One Chat.</span>
              </h1>
            </AnimatedSection>

            <AnimatedSection delay={0.15}>
              <p className="text-lg md:text-xl leading-relaxed text-[#8a8f9e] max-w-xl mb-10">
                Tell your AI bot what to post on Telegram. It rewrites for each
                platform&apos;s tone and audience, then publishes everywhere —
                while you move on with your day.
              </p>
            </AnimatedSection>

            <AnimatedSection delay={0.3}>
              <Button
                size="lg"
                onClick={handleGetStarted}
                className="text-base px-10 h-14 bg-[#e8614d] hover:bg-[#d4563f] text-white"
              >
                Start Free Trial
              </Button>
              <p className="text-sm text-[#555a6b] mt-3">
                Then $39/mo. Cancel anytime.
              </p>
            </AnimatedSection>

            <AnimatedSection delay={0.4}>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#1e2233] bg-[#151929]/80 px-4 py-2">
                <span className="text-sm text-[#7a7f94]">Powered by</span>
                <span className="text-sm font-semibold text-[#e8614d]">OpenClaw</span>
                <span className="text-xs text-[#7a7f94]">— 140K+ GitHub stars</span>
              </div>
            </AnimatedSection>
          </div>

          <AnimatedSection delay={0.3}>
            <div className="flex items-center gap-4 md:gap-6">
              <div className="-rotate-3">
                <Image
                  src="/images/IMG_2617.PNG"
                  alt="Telegram bot drafting a post about building in public"
                  width={280}
                  height={560}
                  className="rounded-3xl shadow-2xl shadow-black/40"
                  priority
                />
              </div>
              <div className="rotate-3 mt-12">
                <Image
                  src="/images/IMG_2618.PNG"
                  alt="Telegram bot scheduling 3 posts for tomorrow"
                  width={280}
                  height={560}
                  className="rounded-3xl shadow-2xl shadow-black/40"
                  priority
                />
              </div>
            </div>
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
