import { UserPlus, Link2, MessageCircle } from "lucide-react";
import AnimatedSection from "@/components/sections/AnimatedSection";

const steps = [
  {
    number: 1,
    icon: UserPlus,
    title: "Sign up & subscribe",
    description:
      "Create your account and subscribe for $39/mo. Your private AI bot is deployed in under 2 minutes.",
  },
  {
    number: 2,
    icon: Link2,
    title: "Connect your accounts",
    description:
      "Link your social media accounts from the dashboard. We support 13 platforms — connect as many as you want.",
  },
  {
    number: 3,
    icon: MessageCircle,
    title: "Chat to publish",
    description:
      "Open Telegram, tell your bot what to post. It writes, adapts, and publishes. Done.",
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="container mx-auto px-4 py-20 md:py-24">
      <div className="mx-auto max-w-6xl">
        <AnimatedSection>
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-muted-foreground">
              From signup to your first post in under 5 minutes
            </p>
          </div>
        </AnimatedSection>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          {steps.map((step) => (
            <AnimatedSection key={step.number} delay={step.number * 0.15}>
              <div className="text-center">
                <div className="relative mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <step.icon className="h-7 w-7 text-primary" />
                  <span className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {step.number}
                  </span>
                </div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
