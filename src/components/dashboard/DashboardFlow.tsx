"use client";

import { useState } from "react";
import { Clock, Zap, BarChart3, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLATFORMS } from "@/lib/constants/platforms";
import ChatWithLoader from "@/components/dashboard/ChatWithLoader";
import SubscribeModal from "@/components/dashboard/SubscribeModal";

interface DashboardFlowProps {
  initialHasSubscription: boolean;
  initialHasFlyMachine: boolean;
}

const benefits = [
  {
    icon: Clock,
    title: "Hours saved every week",
    description:
      "Write once, publish everywhere. No more copying and pasting across platforms.",
  },
  {
    icon: Zap,
    title: "Consistent posting on autopilot",
    description:
      "Your AI social media manager creates platform-native content adapted to each audience.",
  },
  {
    icon: BarChart3,
    title: "Grow on every platform at once",
    description:
      "Be present on X, LinkedIn, Instagram, TikTok, and 9 more — without the busywork.",
  },
];

const TUTORIAL_VIDEOS = [
  {
    id: "ypoRFsYFSQU",
    title: "Getting started with PostClaw",
  },
];

const FEATURED_PLATFORM_IDS = [
  "twitter",
  "linkedin",
  "instagram",
  "tiktok",
  "threads",
  "bluesky",
  "youtube",
  "reddit",
  "facebook",
];

export default function DashboardFlow({
  initialHasSubscription,
  initialHasFlyMachine,
}: DashboardFlowProps) {
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);

  // Bot already provisioned or subscription active (provisioning triggered by webhook)
  if (initialHasFlyMachine || initialHasSubscription) {
    return <ChatWithLoader />;
  }

  const featuredPlatforms = FEATURED_PLATFORM_IDS.map((id) =>
    PLATFORMS.find((p) => p.id === id)
  ).filter(Boolean);

  // No subscription → outcome-focused deploy prompt
  return (
    <>
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] px-4">
        <div className="w-full max-w-2xl">
          {/* Progress hint — Zeigarnik effect */}
          <div className="text-center mb-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#e8614d] bg-[#e8614d]/10 px-3 py-1 rounded-full">
              Almost there — one step left
            </span>
          </div>

          {/* Headline — outcome-focused, contrast effect */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-3">
              Stop juggling platforms.
              <br />
              Start growing everywhere.
            </h1>
            <p className="text-gray-500 text-base max-w-md mx-auto">
              Tell your AI social media manager what to post. It writes, adapts,
              and publishes to every platform — so you don&apos;t have to.
            </p>
          </div>

          {/* CTA — moved above the fold, pulse glow animation */}
          <div className="text-center mb-10 animate-fade-in-up">
            <Button
              size="lg"
              className="bg-[#e8614d] hover:bg-[#d4563f] text-white px-8 text-base h-12 cursor-pointer animate-pulse-glow"
              onClick={() => setShowSubscribeModal(true)}
            >
              Start posting everywhere
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            {/* Anchoring + regret aversion */}
            <p className="text-xs text-gray-400 mt-3">
              Plans from $17/mo · Cancel anytime
            </p>
          </div>

          {/* Benefits — Jobs to Be Done framing */}
          <div className="grid gap-4 mb-8">
            {benefits.map((benefit) => (
              <div
                key={benefit.title}
                className="flex items-start gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#e8614d]/10">
                  <benefit.icon className="h-5 w-5 text-[#e8614d]" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {benefit.title}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {benefit.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Platform icons — mere exposure, makes "13+" tangible */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {featuredPlatforms.map((platform) => (
              <span
                key={platform!.id}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                style={{ backgroundColor: platform!.color }}
                title={platform!.label}
              >
                {platform!.icon}
              </span>
            ))}
            <span className="flex h-8 items-center text-xs font-medium text-gray-400 ml-1">
              +4 more
            </span>
          </div>

          {/* Tutorial videos */}
          <div className="space-y-3 mt-10">
            {TUTORIAL_VIDEOS.map((video) => (
              <div
                key={video.id}
                className="rounded-xl overflow-hidden border border-gray-100 bg-white shadow-sm"
              >
                <div className="aspect-video">
                  <iframe
                    src={`https://www.youtube.com/embed/${video.id}?rel=0`}
                    title={video.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
                <div className="px-4 py-2.5">
                  <p className="text-sm font-medium text-gray-700">
                    {video.title}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <SubscribeModal
        open={showSubscribeModal}
        onOpenChange={setShowSubscribeModal}
      />
    </>
  );
}
