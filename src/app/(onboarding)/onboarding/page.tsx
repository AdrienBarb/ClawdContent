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
  MessageCircle,
  Share2,
  Zap,
  Check,
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

const TOTAL_STEPS = 3;

export default function OnboardingPage() {
  const router = useRouter();
  const { usePost } = useApi();
  const [step, setStep] = useState(1);
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
      role: selectedRole ?? undefined,
      niche: niche || undefined,
      topics: selectedTopics.length > 0 ? selectedTopics : undefined,
    });
  };

  const handleSkip = () => {
    saveOnboarding({});
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
          {step < 3 && (
            <button
              onClick={handleSkip}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              disabled={isPending}
            >
              Skip setup
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

      {/* Step 1: Role */}
      {step === 1 && (
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
              What best describes you?
            </h1>
            <p className="text-gray-500 mt-2">
              We&apos;ll tailor your bot&apos;s content strategy to your goals.
            </p>
          </div>

          <div className="space-y-3">
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
                    <p className="text-xs text-gray-500">{role.description}</p>
                  </div>
                  <span
                    className={`h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center ${
                      isSelected
                        ? "border-[#e8614d] bg-[#e8614d]"
                        : "border-gray-300"
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3 text-white" />}
                  </span>
                </button>
              );
            })}
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

      {/* Step 2: Niche & Topics */}
      {step === 2 && (
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
              What do you talk about?
            </h1>
            <p className="text-gray-500 mt-2">
              Your bot needs to know your world to write like you.
            </p>
          </div>

          <div className="space-y-6">
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
              onClick={() => setStep(3)}
              className="bg-[#e8614d] hover:bg-[#d4563f] text-white"
            >
              Continue
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Value showcase */}
      {step === 3 && (
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
              You&apos;re all set. Here&apos;s what you get.
            </h1>
            <p className="text-gray-500 mt-2">
              Your personal AI content manager, always ready on Telegram.
            </p>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <MessageCircle className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Chat to create
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Tell your bot what to post. It writes, you approve.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <Share2 className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Post everywhere
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    One message, published to Twitter/X, LinkedIn, Bluesky &
                    Threads.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <Zap className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Always on
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Your bot remembers your style and improves over time. No
                    dashboards, no scheduling tools.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Old way vs new way */}
          <div className="grid grid-cols-2 gap-3 mt-6">
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                The old way
              </p>
              <p className="text-2xl font-bold text-gray-400">5+ hrs</p>
              <p className="text-xs text-gray-400 mt-1">
                per week juggling tools
              </p>
            </div>
            <div className="rounded-xl bg-[#e8614d]/5 border border-[#e8614d]/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#e8614d] mb-2">
                With PostClaw
              </p>
              <p className="text-2xl font-bold text-[#e8614d]">5 min</p>
              <p className="text-xs text-gray-500 mt-1">
                on Telegram, done
              </p>
            </div>
          </div>

          <div className="mt-8 flex justify-between">
            <Button
              variant="ghost"
              onClick={() => setStep(2)}
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
              {isPending ? "Setting up..." : "Start chatting"}
              {!isPending && <ArrowRight className="h-4 w-4 ml-1.5" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
