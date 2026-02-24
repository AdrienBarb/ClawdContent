"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useSession } from "@/lib/better-auth/auth-client";
import { useRouter } from "next/navigation";
import { appRouter } from "@/lib/constants/appRouter";
import SignInModal from "@/components/SignInModal";
import AnimatedSection from "@/components/sections/AnimatedSection";
import Image from "next/image";

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
    <section className="hero-warm-glow min-h-[85vh] flex items-center">
      <div className="container mx-auto px-6 py-20 md:py-28">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          <div className="max-w-3xl lg:max-w-xl flex-shrink-0">
            <AnimatedSection>
              <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-bold leading-[1.1] tracking-tight mb-8">
                Publish Everywhere.
                <br />
                From One Chat.
              </h1>
            </AnimatedSection>

            <AnimatedSection delay={0.15}>
              <p className="text-lg md:text-xl leading-relaxed text-muted-foreground max-w-xl mb-10">
                Tell your AI bot what to post. It writes, adapts for each
                platform, and publishes to{" "}
                <strong className="text-foreground font-semibold">
                  13 social networks
                </strong>{" "}
                — all from one Telegram conversation. No dashboards. No
                scheduling tools. <em className="italic">Just chat.</em>
              </p>
            </AnimatedSection>

            <AnimatedSection delay={0.3}>
              <Button
                size="lg"
                onClick={handleGetStarted}
                className="text-base px-10 h-14"
              >
                Get Started — $39/mo
              </Button>
            </AnimatedSection>

            <AnimatedSection delay={0.4}>
              <p className="mt-5 text-sm text-muted-foreground">
                Powered by OpenClaw — 140K+ GitHub stars
              </p>
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
                  className="rounded-3xl shadow-2xl"
                  priority
                />
              </div>
              <div className="rotate-3 mt-12">
                <Image
                  src="/images/IMG_2618.PNG"
                  alt="Telegram bot scheduling 3 posts for tomorrow"
                  width={280}
                  height={560}
                  className="rounded-3xl shadow-2xl"
                  priority
                />
              </div>
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
