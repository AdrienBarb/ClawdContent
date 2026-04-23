"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useSession } from "@/lib/better-auth/auth-client";
import { useRouter } from "next/navigation";
import { appRouter } from "@/lib/constants/appRouter";
import SignInModal from "@/components/SignInModal";
import { BrainIcon, ShieldCheckIcon, SparkleIcon, ClockIcon } from "@phosphor-icons/react";

const features = [
  {
    icon: SparkleIcon,
    title: "It does the thinking\nfor you.",
    description:
      "Scheduling tools still need you to write the content. PostClaw figures out what to post, writes it, and handles the timing. You just approve.",
  },
  {
    icon: BrainIcon,
    title: "It sounds like you,\nnot a robot.",
    description:
      "It learns your tone, your niche, and what your audience responds to. After a few weeks, your followers won't know you didn't write it yourself.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Nothing goes live\nwithout your OK.",
    description:
      "Every post is shown to you first. Edit it, approve it, or ask for a rewrite. Your accounts, your rules. No surprises.",
  },
  {
    icon: ClockIcon,
    title: "Simpler than anything\nyou've tried.",
    description:
      "No dashboards to learn. No editors to figure out. No content calendars to fill. You approve posts. That's it.",
  },
];

const comparisons = [
  {
    without: "45 minutes writing one Instagram caption",
    with: "Approve a ready-made post in 10 seconds",
  },
  {
    without: "Googling 'what to post for my business'",
    with: "Open the app. Post ideas already waiting.",
  },
  {
    without: "Same caption copy-pasted to every platform",
    with: "Each post rewritten for Instagram, Facebook, LinkedIn",
  },
  {
    without: "Forgetting to post for weeks, then feeling guilty",
    with: "Daily posts on autopilot, zero effort",
  },
  {
    without: "Hiring a social media person: $1,000-2,000/mo",
    with: "From $17/mo. Less than your phone bill.",
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
                What changes when PostClaw takes over
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
                Start posting today
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
