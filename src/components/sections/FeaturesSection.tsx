"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useSession } from "@/lib/better-auth/auth-client";
import { useRouter } from "next/navigation";
import { appRouter } from "@/lib/constants/appRouter";
import SignInModal from "@/components/SignInModal";
import AnimatedSection from "@/components/sections/AnimatedSection";
import { MessageSquare, Sparkles, Shield } from "lucide-react";

const features = [
  {
    icon: MessageSquare,
    title: "Just chat — no new\ntools to learn",
    description:
      "If you can send a Telegram message, you can manage your social media. Tell your bot what to post in plain language — it handles the rest.",
  },
  {
    icon: Sparkles,
    title: "AI that adapts\nfor every platform",
    description:
      "Your bot doesn't copy-paste. It rewrites and tailors your content for each platform's format, tone, and audience — automatically.",
  },
  {
    icon: Shield,
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
            <h2 className="text-4xl md:text-5xl font-bold text-center mb-20 text-white">
              How PostClaw Works
            </h2>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {features.map((feature, index) => (
              <AnimatedSection key={feature.title} delay={index * 0.15}>
                <div className="bg-[#151929] border border-[#1e2233] rounded-2xl p-8 h-full hover:border-[#e8614d]/20 transition-colors">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8614d]/10 mb-5">
                    <feature.icon className="h-5 w-5 text-[#e8614d]" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-semibold mb-4 whitespace-pre-line leading-snug text-white">
                    {feature.title}
                  </h3>
                  <p className="text-[#7a7f94] leading-relaxed text-[0.95rem]">
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
                className="text-base px-10 h-14 bg-[#e8614d] hover:bg-[#d4563f] text-white"
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
