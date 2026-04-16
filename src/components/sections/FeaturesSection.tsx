"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useSession } from "@/lib/better-auth/auth-client";
import { useRouter } from "next/navigation";
import { appRouter } from "@/lib/constants/appRouter";
import SignInModal from "@/components/SignInModal";
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
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-4 text-foreground">
            Why PostClaw
          </h2>
          <p className="text-center text-secondary-foreground text-lg mb-20">
            Not another scheduling tool. An AI that actually works for you.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
            {features.map((feature, index) => (
              <div key={feature.title} className="bg-card border border-border rounded-2xl p-8 h-full hover:border-primary/30 transition-colors shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 mb-5">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-xl md:text-2xl font-semibold mb-4 whitespace-pre-line leading-snug text-foreground">
                  {feature.title}
                </h3>
                <p className="text-secondary-foreground leading-relaxed text-[0.95rem]">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* Before / After comparison */}
          <div className="rounded-[2rem] border border-border bg-card p-8 md:p-12 mb-16 shadow-sm">
              <h3 className="text-2xl md:text-3xl font-bold text-center mb-10 text-foreground">
                Before PostClaw vs. After PostClaw
              </h3>
              <div className="space-y-4">
                {comparisons.map((row, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4"
                  >
                    <div className="flex items-center gap-3 bg-secondary border border-border rounded-xl px-5 py-3.5">
                      <span className="text-red-400/70 text-lg shrink-0">
                        &times;
                      </span>
                      <span className="text-secondary-foreground text-[0.92rem]">
                        {row.without}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 bg-[#fef7f6] border border-primary/15 rounded-xl px-5 py-3.5">
                      <span className="text-primary text-lg shrink-0">
                        &#10003;
                      </span>
                      <span className="text-foreground text-[0.92rem]">
                        {row.with}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          <div className="text-center">
              <Button
                size="lg"
                onClick={handleGetStarted}
                className="text-base px-10 h-14 bg-primary hover:bg-[#E84A36] text-white rounded-full"
              >
                Launch my AI manager
              </Button>
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
