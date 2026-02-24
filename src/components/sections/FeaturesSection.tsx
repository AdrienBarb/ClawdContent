"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useSession } from "@/lib/better-auth/auth-client";
import { useRouter } from "next/navigation";
import { appRouter } from "@/lib/constants/appRouter";
import SignInModal from "@/components/SignInModal";
import AnimatedSection from "@/components/sections/AnimatedSection";

const features = [
  {
    title: "Just chat — no new\ntools to learn",
    description:
      "If you can send a Telegram message, you can manage your social media. Tell your bot what to post in plain language — it handles the rest.",
  },
  {
    title: "AI that adapts\nfor every platform",
    description:
      "Your bot doesn't copy-paste. It rewrites and tailors your content for each platform's format, tone, and audience — automatically.",
  },
  {
    title: "Private, secure,\nand always yours",
    description:
      "Built on OpenClaw, the open-source AI agent with 140K+ GitHub stars. Your own isolated instance — no shared infrastructure, no data leaks.",
  },
];

export default function FeaturesSection() {
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
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-6">
        <div className="mx-auto max-w-5xl">
          <AnimatedSection>
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-center mb-20">
              How PostClaw Works
            </h2>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16 mb-16">
            {features.map((feature, index) => (
              <AnimatedSection key={feature.title} delay={index * 0.15}>
                <div className="text-center">
                  <h3 className="font-serif text-xl md:text-2xl font-semibold mb-4 whitespace-pre-line leading-snug">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed text-[0.95rem]">
                    {feature.description}
                  </p>
                </div>
              </AnimatedSection>
            ))}
          </div>

          <AnimatedSection delay={0.5}>
            <div className="text-center">
              <Button
                size="lg"
                onClick={handleGetStarted}
                className="text-base px-10 h-14"
              >
                Get Started — $39/mo
              </Button>
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
