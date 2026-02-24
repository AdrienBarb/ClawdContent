import { ArrowRight } from "lucide-react";
import AnimatedSection from "@/components/sections/AnimatedSection";

const steps = [
  {
    title: "Sign up & subscribe",
    description:
      "Create your account and subscribe for $39/mo. Your private AI bot is deployed in under 2 minutes.",
  },
  {
    title: "Connect your accounts",
    description:
      "Link your social media accounts from the dashboard. We support 13 platforms — connect as many as you want.",
  },
  {
    title: "Chat to publish",
    description:
      "Open Telegram, tell your bot what to post. It writes, adapts for each platform, and publishes. Done.",
  },
];

const platforms = [
  "Instagram & TikTok",
  "X, LinkedIn & Facebook",
  "YouTube & Pinterest",
  "Threads & Bluesky",
  "Reddit, Telegram & Discord",
  "Mastodon",
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 md:py-28 px-6">
      <div className="container mx-auto">
        <div className="mx-auto max-w-6xl">
          <AnimatedSection>
            <div className="bg-lavender rounded-[2rem] p-10 md:p-16">
              <h2 className="font-serif text-4xl md:text-5xl font-bold text-center mb-12">
                What Will You
                <br />
                Publish Today?
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
                {platforms.map((platform) => (
                  <div
                    key={platform}
                    className="flex items-center justify-between bg-white rounded-2xl px-6 py-5 text-foreground font-medium text-[0.95rem] shadow-sm"
                  >
                    <span>{platform}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
