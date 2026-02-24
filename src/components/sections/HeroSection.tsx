"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useSession } from "@/lib/better-auth/auth-client";
import { useRouter } from "next/navigation";
import { appRouter } from "@/lib/constants/appRouter";
import useApi from "@/lib/hooks/useApi";
import AnimatedSection from "@/components/sections/AnimatedSection";

const platforms = [
  "Instagram",
  "TikTok",
  "X / Twitter",
  "LinkedIn",
  "Facebook",
  "YouTube",
  "Pinterest",
  "Threads",
  "Bluesky",
  "Reddit",
  "Telegram",
  "Discord",
  "Mastodon",
];

export default function HeroSection() {
  const { data: session } = useSession();
  const router = useRouter();
  const { usePost } = useApi();
  const [isLoading, setIsLoading] = useState(false);

  const { mutate: createCheckout } = usePost(appRouter.api.checkout, {
    onSuccess: (data: { url: string }) => {
      window.location.href = data.url;
    },
    onSettled: () => setIsLoading(false),
  });

  const handleGetStarted = () => {
    if (!session?.user) {
      router.push(appRouter.signin);
      return;
    }
    setIsLoading(true);
    createCheckout({});
  };

  return (
    <section className="container mx-auto px-4 py-20 md:py-32">
      <div className="mx-auto max-w-4xl text-center">
        <AnimatedSection>
          <Badge variant="secondary" className="mb-6 text-sm font-medium">
            Powered by OpenClaw — 140K+ GitHub stars
          </Badge>
        </AnimatedSection>

        <AnimatedSection delay={0.1}>
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl mb-6">
            Stop managing social media.
            <br />
            <span className="text-primary">Start chatting.</span>
          </h1>
        </AnimatedSection>

        <AnimatedSection delay={0.2}>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Tell your AI bot what to post. It writes, adapts, and publishes to{" "}
            <strong className="text-foreground">13 platforms</strong> — all from
            one Telegram conversation. No dashboards. No scheduling tools. Just
            chat.
          </p>
        </AnimatedSection>

        <AnimatedSection delay={0.3}>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button
              size="lg"
              onClick={handleGetStarted}
              disabled={isLoading}
              className="text-base px-8 py-6"
            >
              {isLoading ? "Loading..." : "Get Started — $39/mo"}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-base px-8 py-6"
              onClick={() => {
                document
                  .getElementById("how-it-works")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              See How It Works
            </Button>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={0.4}>
          <div className="flex flex-wrap justify-center gap-2">
            {platforms.map((platform) => (
              <Badge key={platform} variant="outline" className="text-xs">
                {platform}
              </Badge>
            ))}
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
