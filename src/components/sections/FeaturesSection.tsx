"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useSession } from "@/lib/better-auth/auth-client";
import { useRouter } from "next/navigation";
import { appRouter } from "@/lib/constants/appRouter";
import SignInModal from "@/components/SignInModal";
import AnimatedSection from "@/components/sections/AnimatedSection";
import { Brain, Shield, Sparkles, Clock } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "It learns you.",
    description:
      "Most AI tools start from zero every time. PostClaw remembers your brand voice, your audience, your content history, and what works. Week 1 is good. Week 8 is indistinguishable from you writing it yourself.",
  },
  {
    icon: Shield,
    title: "It\u2019s yours alone.",
    description:
      "Every PostClaw user gets a private, dedicated AI instance running 24/7 on its own server. Your brand knowledge, conversations, and content strategy stay isolated and protected. No shared data. No shared infrastructure. No access from other users.",
  },
  {
    icon: Sparkles,
    title: "It thinks,\nnot just posts.",
    description:
      "PostClaw doesn\u2019t wait for you to have an idea. It suggests content based on your niche, monitors trends, and plans ahead. It\u2019s the difference between a tool that does what you say and a social media manager that knows what to do.",
  },
  {
    icon: Clock,
    title: "Nothing new\nto learn.",
    description:
      "If you can send a message, you already know how to use PostClaw. No dashboards to navigate. No editors to figure out. No 30-minute onboarding tutorials. Just chat.",
  },
];

const comparisons = [
  {
    without: "45+ min/day juggling 5 apps and rewriting the same post",
    with: "2 min/day \u2014 one conversation",
  },
  {
    without: "Same text copy-pasted everywhere (and it shows)",
    with: "AI adapts tone, length, and format for each platform",
  },
  {
    without: "Constant guilt about platforms you\u2019re ignoring",
    with: "13 platforms covered, none neglected",
  },
  {
    without: "Staring at a blank editor wondering what to post",
    with: "Your AI suggests topics, plans your calendar, and writes first drafts",
  },
  {
    without: "Hiring a freelancer: $500\u20132,000/mo. Hiring in-house: $4,000+/mo",
    with: "From $17/mo \u2014 your AI social media manager, on 24/7",
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
            <h2 className="text-4xl md:text-5xl font-bold text-center mb-4 text-white">
              Why PostClaw
            </h2>
            <p className="text-center text-[#7a7f94] text-lg mb-20">
              Not another scheduling tool. An AI that actually works for you.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
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
                Before PostClaw vs. After PostClaw
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
                Get Started
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
