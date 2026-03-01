"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useSession } from "@/lib/better-auth/auth-client";
import { useRouter } from "next/navigation";
import { appRouter } from "@/lib/constants/appRouter";
import SignInModal from "@/components/SignInModal";
import AnimatedSection from "@/components/sections/AnimatedSection";
import { Sparkles, Shield, Clock } from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "Your content sounds\nnative everywhere",
    description:
      "Your bot doesn\u2019t copy-paste. Your LinkedIn post sounds professional, your tweet is punchy, your Threads post is conversational \u2014 all from a single message.",
  },
  {
    icon: Shield,
    title: "Your own private\nbot instance",
    description:
      "Not a shared service. Your isolated instance runs 24/7 on its own server. No data leaks, no shared infrastructure, no access from other users.",
  },
  {
    icon: Clock,
    title: "Nothing new\nto learn",
    description:
      "If you can send a Telegram message, you already know how to use PostClaw. No dashboards to navigate, no editors to figure out. Just chat.",
  },
];

const comparisons = [
  {
    without: "45+ min/day managing multiple platforms",
    with: "2 min/day \u2014 one Telegram message",
  },
  {
    without: "Same text copy-pasted everywhere",
    with: "AI adapts tone for each platform",
  },
  {
    without: "Juggle 5 different apps and tabs",
    with: "One chat thread does it all",
  },
  {
    without: "$200/mo in tools or $2,000/mo for a freelancer",
    with: "$39/mo \u2014 everything included",
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
              Why PostClaw
            </h2>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
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

          {/* Before / After comparison */}
          <AnimatedSection>
            <div className="rounded-[2rem] border border-[#1e2233] bg-[#111320] p-8 md:p-12 mb-16">
              <h3 className="text-2xl md:text-3xl font-bold text-center mb-10 text-white">
                Before &amp; After
              </h3>
              <div className="space-y-4">
                {comparisons.map((row, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4"
                  >
                    <div className="flex items-center gap-3 bg-[#151929] border border-[#1e2233] rounded-xl px-5 py-3.5">
                      <span className="text-red-400/70 text-lg shrink-0">
                        &times;
                      </span>
                      <span className="text-[#7a7f94] text-[0.92rem]">
                        {row.without}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 bg-[#151929] border border-[#e8614d]/15 rounded-xl px-5 py-3.5">
                      <span className="text-[#e8614d] text-lg shrink-0">
                        &#10003;
                      </span>
                      <span className="text-[#c0c4d0] text-[0.92rem]">
                        {row.with}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.2}>
            <div className="text-center">
              <Button
                size="lg"
                onClick={handleGetStarted}
                className="text-base px-10 h-14 bg-[#e8614d] hover:bg-[#d4563f] text-white"
              >
                Start Free Trial
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
