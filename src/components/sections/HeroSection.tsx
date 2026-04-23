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
                  { src: "/images/reassurance/kaya.jpeg", name: "Kaya", linkedin: "https://www.linkedin.com/in/kayayurieff/" },
                  { src: "/images/reassurance/jorje.jpeg", name: "Jorge", linkedin: "https://www.linkedin.com/in/jorge-zuloaga/" },
                  { src: "/images/reassurance/Sheryl.jpeg", name: "Sheryl", linkedin: "https://www.linkedin.com/in/sheryl-sandberg-5126652/" },
                  { src: "/images/reassurance/abhilaksh.jpeg", name: "Abhilaksh", linkedin: "https://www.linkedin.com/in/abhilaksh-sharma-39821696/" },
                  { src: "/images/reassurance/sawyer.jpeg", name: "Sawyer", linkedin: "https://www.linkedin.com/in/sawyer-hemsley-6b9449111/" },
                ].map((person) => (
                  <a
                    key={person.name}
                    href={person.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={person.name}
                    className="relative h-8 w-8 rounded-full overflow-hidden ring-2 ring-[#ededf5] hover:scale-110 hover:z-10 transition-transform"
                  >
                    <Image
                      src={person.src}
                      alt={person.name}
                      width={32}
                      height={32}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  </a>
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
              <span className="text-foreground">Your AI Social Media</span>
              <br />
              <span className="text-primary">Manager.</span>
            </h1>

          {/* Subhead — sans-serif */}
          <p className="text-lg md:text-xl leading-relaxed text-secondary-foreground max-w-2xl mb-10">
            You run your business. It runs your Instagram, Facebook, and everything else.
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
