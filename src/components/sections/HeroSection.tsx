"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useSession } from "@/lib/better-auth/auth-client";
import { useRouter } from "next/navigation";
import { appRouter } from "@/lib/constants/appRouter";
import SignInModal from "@/components/SignInModal";
import { PLATFORMS } from "@/lib/constants/platforms";
import Image from "next/image";

interface HeroSectionProps {
  variant?: string;
}

export default function HeroSection({ variant = "control" }: HeroSectionProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);

  void variant;

  const handleGetStarted = () => {
    if (session?.user) {
      router.push(appRouter.dashboard);
      return;
    }
    setIsSignInModalOpen(true);
  };

  return (
    <section className="hero-landing-glow grain-overlay relative min-h-[85vh] flex items-center">
      <div className="container mx-auto px-6 py-12 md:py-16">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
          {/* Social proof row */}
          <div className="flex flex-col items-center gap-2 mb-10">
              <div className="flex -space-x-2">
                {[
                  { src: "/images/avatars/avatar-1.jpg", alt: "PostClaw user" },
                  { src: "/images/avatars/avatar-2.jpg", alt: "PostClaw user" },
                  { src: "/images/avatars/avatar-3.jpg", alt: "PostClaw user" },
                  { src: "/images/avatars/avatar-4.jpg", alt: "PostClaw user" },
                  { src: "/images/avatars/avatar-5.jpg", alt: "PostClaw user" },
                ].map((avatar, i) => (
                  <Image
                    key={i}
                    src={avatar.src}
                    alt={avatar.alt}
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-full object-cover ring-2 ring-[#ededf5]"
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                Join 300+ founders on autopilot
              </span>
            </div>

          {/* Headline — serif */}
          <h1
              className="font-serif text-6xl md:text-7xl lg:text-8xl leading-[1.05] tracking-[-0.02em] mb-6"
              style={{ fontWeight: 400 }}
            >
              <span className="text-foreground">Your AI Social Media</span>
              <br />
              <span className="text-primary">Manager.</span>
            </h1>

          {/* Subhead — sans-serif */}
          <p className="text-lg md:text-xl leading-relaxed text-secondary-foreground max-w-2xl mb-10">
            Learns your brand. Plans your content. Posts to 13 platforms.
          </p>

          {/* CTA */}
          <Button
              size="lg"
              onClick={handleGetStarted}
              aria-label="Get started with PostClaw"
              className="text-base px-10 h-14 bg-primary hover:bg-[#E84A36] text-primary-foreground rounded-full shadow-[0_10px_40px_-10px_rgba(255,94,72,0.5)] hover:shadow-[0_14px_50px_-10px_rgba(255,94,72,0.6)] hover:-translate-y-0.5 transition-all"
            >
              Start posting today
            </Button>
        </div>

        {/* Platform marquee — more breathing room */}
        <div className="mt-20 md:mt-28 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#ededf5] to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#ededf5] to-transparent z-10 pointer-events-none" />
            <div className="flex animate-marquee gap-8">
              {[...PLATFORMS, ...PLATFORMS].map((platform, i) => (
                <div
                  key={`${platform.id}-${i}`}
                  className="flex items-center gap-2 shrink-0 rounded-full border border-border bg-card/70 px-4 py-2 shadow-sm"
                >
                  <span style={{ color: platform.color }}>
                    {platform.icon}
                  </span>
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {platform.label}
                  </span>
                </div>
              ))}
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
