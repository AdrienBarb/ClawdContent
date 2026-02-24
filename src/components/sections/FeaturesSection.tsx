import {
  MessageCircle,
  Globe,
  Sparkles,
  Shield,
  Clock,
  Zap,
} from "lucide-react";
import AnimatedSection from "@/components/sections/AnimatedSection";

const features = [
  {
    icon: MessageCircle,
    title: "Just chat — no learning curve",
    description:
      "No new tools to learn. If you can send a Telegram message, you can manage your social media. Tell your bot what to post in plain language.",
  },
  {
    icon: Globe,
    title: "13 platforms, one message",
    description:
      "Instagram, TikTok, X, LinkedIn, Facebook, YouTube, Pinterest, Threads, Bluesky, Reddit, Telegram, Discord, and Mastodon. One message, everywhere.",
  },
  {
    icon: Sparkles,
    title: "AI-adapted for each platform",
    description:
      "Your bot doesn't just copy-paste. It rewrites and adapts your content for each platform's format, tone, and audience.",
  },
  {
    icon: Shield,
    title: "Powered by OpenClaw",
    description:
      "Built on the open-source AI agent with 140K+ GitHub stars. Your own private, isolated instance — no shared infrastructure, no data leaks.",
  },
  {
    icon: Clock,
    title: "24/7, always ready",
    description:
      "Your bot never sleeps, never takes vacations, and never misses a deadline. Post at 3 AM or on a Sunday — it's always there.",
  },
  {
    icon: Zap,
    title: "From idea to published in seconds",
    description:
      "No drafts, no approval chains, no scheduling queues. Tell your bot, it publishes. The fastest path from idea to live post.",
  },
];

export default function FeaturesSection() {
  return (
    <section className="bg-muted/50 py-20 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-6xl">
          <AnimatedSection>
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4">
                Everything a social media manager does.
                <br className="hidden sm:block" />
                Minus the salary.
              </h2>
              <p className="text-xl text-muted-foreground">
                Your AI bot handles the hard parts so you can focus on your
                business.
              </p>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <AnimatedSection key={feature.title} delay={index * 0.1}>
                <div className="p-6 rounded-lg border bg-background hover:shadow-lg transition-shadow h-full">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
