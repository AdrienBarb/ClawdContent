"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { appRouter } from "@/lib/constants/appRouter";
import useApi from "@/lib/hooks/useApi";
import {
  Lightbulb,
  Rocket,
  Briefcase,
  Pen,
  Megaphone,
  ArrowRight,
  ArrowLeft,
  Check,
  MessageCircle,
  ExternalLink,
} from "lucide-react";

const roles = [
  {
    id: "solopreneur",
    label: "Solopreneur / Indie Maker",
    description: "I'm building a product and growing my audience.",
    icon: Rocket,
  },
  {
    id: "startup_founder",
    label: "Startup Founder",
    description: "I'm raising awareness for my company.",
    icon: Lightbulb,
  },
  {
    id: "freelancer",
    label: "Freelancer / Consultant",
    description: "I want to attract clients through content.",
    icon: Briefcase,
  },
  {
    id: "content_creator",
    label: "Content Creator",
    description: "I'm building a personal brand.",
    icon: Pen,
  },
  {
    id: "marketing_manager",
    label: "Marketing Manager",
    description: "I handle content for a company.",
    icon: Megaphone,
  },
];

const topicOptions = [
  "AI",
  "Marketing",
  "Design",
  "Development",
  "Business",
  "Finance",
  "Health",
  "Productivity",
  "E-commerce",
  "Education",
  "Crypto",
  "Lifestyle",
];

const TOTAL_STEPS = 2;

export default function OnboardingPage() {
  const router = useRouter();
  const { usePost } = useApi();
  const [step, setStep] = useState(1);
  const [telegramToken, setTelegramToken] = useState("");
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [niche, setNiche] = useState("");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [customTopic, setCustomTopic] = useState("");

  const { mutate: saveOnboarding, isPending } = usePost(
    appRouter.api.onboarding,
    {
      onSuccess: () => {
        router.push(appRouter.dashboard);
      },
    }
  );

  const handleFinish = () => {
    saveOnboarding({
      telegramBotToken: telegramToken.trim() || undefined,
      role: selectedRole ?? undefined,
      niche: niche || undefined,
      topics: selectedTopics.length > 0 ? selectedTopics : undefined,
    });
  };

  const handleSkip = () => {
    saveOnboarding({
      telegramBotToken: telegramToken.trim() || undefined,
    });
  };

  const toggleTopic = (topic: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topic)
        ? prev.filter((t) => t !== topic)
        : prev.length < 4
          ? [...prev, topic]
          : prev
    );
  };

  const addCustomTopic = () => {
    const trimmed = customTopic.trim();
    if (trimmed && !selectedTopics.includes(trimmed) && selectedTopics.length < 4) {
      setSelectedTopics((prev) => [...prev, trimmed]);
      setCustomTopic("");
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4">
      {/* Progress bar */}
      <div className="w-full max-w-lg mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-400">
            Step {step} of {TOTAL_STEPS}
          </span>
          {step === 2 && (
            <button
              onClick={handleSkip}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              disabled={isPending}
            >
              Skip — you can update this later
            </button>
          )}
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#e8614d] rounded-full transition-all duration-500 ease-out"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      {/* Step 1: Telegram Bot Token */}
      {step === 1 && (
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#26A5E4]/10 mx-auto mb-4">
              <MessageCircle className="h-7 w-7 text-[#26A5E4]" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
              Connect your Telegram bot
            </h1>
            <p className="text-gray-500 mt-2">
              OpenClaw works through Telegram. Create a bot and paste its token
              below.
            </p>
          </div>

          {/* Instructions */}
          <div className="rounded-xl bg-gray-50 border border-gray-200 p-5 mb-6">
            <p className="text-sm font-medium text-gray-900 mb-3">
              How to create your bot:
            </p>
            <ol className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e8614d] text-white text-xs font-semibold mt-0.5">
                  1
                </span>
                <span>
                  Open{" "}
                  <a
                    href="https://t.me/BotFather"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#26A5E4] font-medium hover:underline inline-flex items-center gap-1"
                  >
                    @BotFather on Telegram
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e8614d] text-white text-xs font-semibold mt-0.5">
                  2
                </span>
                <span>
                  Send <code className="bg-gray-200 px-1.5 py-0.5 rounded text-xs font-mono">/newbot</code> and follow the steps
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e8614d] text-white text-xs font-semibold mt-0.5">
                  3
                </span>
                <span>Copy the token and paste it below</span>
              </li>
            </ol>
          </div>

          {/* Token input */}
          <div className="space-y-2 mb-2">
            <label
              htmlFor="telegram-token"
              className="block text-sm font-medium text-gray-700"
            >
              Bot token
            </label>
            <input
              id="telegram-token"
              type="text"
              value={telegramToken}
              onChange={(e) => setTelegramToken(e.target.value)}
              placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v..."
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#e8614d] focus:outline-none focus:ring-1 focus:ring-[#e8614d] font-mono"
              autoFocus
            />
          </div>

          <div className="mt-8 flex justify-end">
            <Button
              onClick={() => setStep(2)}
              className="bg-[#e8614d] hover:bg-[#d4563f] text-white"
            >
              Continue
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Context (Role + Niche + Topics) */}
      {step === 2 && (
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
              Better context, better posts
            </h1>
            <p className="text-gray-500 mt-2">
              OpenClaw helps you create and publish content across 13+
              social media platforms. The more it knows about your work,
              the more relevant every post will be.
            </p>
          </div>

          <div className="space-y-8">
            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                What best describes you?
              </label>
              <div className="space-y-2">
                {roles.map((role) => {
                  const isSelected = selectedRole === role.id;
                  return (
                    <button
                      key={role.id}
                      onClick={() => setSelectedRole(role.id)}
                      className={`w-full flex items-center gap-4 rounded-xl border p-4 text-left transition-all cursor-pointer ${
                        isSelected
                          ? "border-[#e8614d] bg-[#e8614d]/5"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                          isSelected
                            ? "bg-[#e8614d] text-white"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        <role.icon className="h-5 w-5" />
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">
                          {role.label}
                        </p>
                        <p className="text-xs text-gray-500">
                          {role.description}
                        </p>
                      </div>
                      <span
                        className={`h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center ${
                          isSelected
                            ? "border-[#e8614d] bg-[#e8614d]"
                            : "border-gray-300"
                        }`}
                      >
                        {isSelected && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Niche */}
            <div>
              <label
                htmlFor="niche"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Describe your business or niche
              </label>
              <textarea
                id="niche"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder="e.g. I run a design agency for SaaS startups"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#e8614d] focus:outline-none focus:ring-1 focus:ring-[#e8614d] resize-none"
                rows={3}
                maxLength={200}
              />
              <p className="text-xs text-gray-400 mt-1 text-right">
                {niche.length}/200
              </p>
            </div>

            {/* Topics */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pick your main topics{" "}
                <span className="text-gray-400 font-normal">(up to 4)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {topicOptions.map((topic) => {
                  const isSelected = selectedTopics.includes(topic);
                  return (
                    <button
                      key={topic}
                      onClick={() => toggleTopic(topic)}
                      className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#e8614d] text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {topic}
                    </button>
                  );
                })}
                {selectedTopics
                  .filter((t) => !topicOptions.includes(t))
                  .map((topic) => (
                    <button
                      key={topic}
                      onClick={() => toggleTopic(topic)}
                      className="rounded-full px-3.5 py-1.5 text-sm font-medium bg-[#e8614d] text-white cursor-pointer"
                    >
                      {topic}
                    </button>
                  ))}
              </div>
              <div className="flex gap-2 mt-3">
                <input
                  type="text"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomTopic();
                    }
                  }}
                  placeholder="Add custom topic..."
                  className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#e8614d] focus:outline-none focus:ring-1 focus:ring-[#e8614d]"
                  maxLength={50}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addCustomTopic}
                  disabled={!customTopic.trim() || selectedTopics.length >= 4}
                >
                  Add
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-between">
            <Button
              variant="ghost"
              onClick={() => setStep(1)}
              className="text-gray-500"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back
            </Button>
            <Button
              onClick={handleFinish}
              className="bg-[#e8614d] hover:bg-[#d4563f] text-white"
              disabled={isPending}
            >
              {isPending ? "Setting up..." : "Finish setup"}
              {!isPending && <ArrowRight className="h-4 w-4 ml-1.5" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
