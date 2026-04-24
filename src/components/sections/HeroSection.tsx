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
                  { src: "/images/testimonial/427228793_1055563818850952_6871033665526776015_n.jpg", name: "Business owner 1" },
                  { src: "/images/testimonial/18011795_447556958969799_4401819888981639168_a.jpg", name: "Business owner 2" },
                  { src: "/images/testimonial/10735611_753231391381135_1551863489_a.jpg", name: "Business owner 3" },
                  { src: "/images/testimonial/501219030_17846298321484295_4697703142460861154_n.jpg", name: "Business owner 4" },
                  { src: "/images/testimonial/557561785_18546285193016965_4034130549721227625_n.jpg", name: "Business owner 5" },
                ].map((person) => (
                  <div
                    key={person.name}
                    className="relative h-8 w-8 rounded-full overflow-hidden ring-2 ring-[#ededf5]"
                  >
                    <Image
                      src={person.src}
                      alt={person.name}
                      width={32}
                      height={32}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  </div>
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                Join 300+ business owners
              </span>
            </div>

          {/* Headline — serif */}
          <h1
              className="font-serif text-6xl md:text-7xl lg:text-8xl leading-[1.05] tracking-[-0.02em] mb-6"
              style={{ fontWeight: 400 }}
            >
              <span className="text-foreground">Your social media,</span>
              <br />
              <span className="text-primary">handled.</span>
            </h1>

          {/* Subhead — sans-serif */}
          <p className="text-lg md:text-xl leading-relaxed text-secondary-foreground max-w-2xl mb-10">
            You run your business. We run your social media.
          </p>

          {/* CTA */}
          <Button
              size="lg"
              onClick={handleGetStarted}
              aria-label="Get started with PostClaw"
              className="text-base px-10 h-14 bg-primary hover:bg-[#E84A36] text-primary-foreground rounded-full shadow-[0_10px_40px_-10px_rgba(255,94,72,0.5)] hover:shadow-[0_14px_50px_-10px_rgba(255,94,72,0.6)] hover:-translate-y-0.5 transition-all"
            >
              Get my 5 free posts
            </Button>
          <p className="mt-3 text-sm text-muted-foreground">
            No credit card required.
          </p>
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
