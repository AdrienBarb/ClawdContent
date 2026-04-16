"use client";

import { useState, useEffect } from "react";
import { appRouter } from "@/lib/constants/appRouter";
import useApi from "@/lib/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Rocket,
  Lightbulb,
  Briefcase,
  Pen,
  Megaphone,
  Check,
  Save,
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

interface ContextData {
  role: string | null;
  niche: string | null;
  topics: string[];
}

export default function ContextPage() {
  const { useGet, usePut } = useApi();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [niche, setNiche] = useState("");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [customTopic, setCustomTopic] = useState("");
  const [saved, setSaved] = useState(false);

  const {
    data: context,
    isLoading,
    refetch,
  } = useGet(appRouter.api.userContext) as {
    data: ContextData | undefined;
    isLoading: boolean;
    refetch: () => void;
  };

  const { mutate: saveContext, isPending } = usePut(appRouter.api.userContext, {
    onSuccess: () => {
      refetch();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  // Populate form when data loads
  useEffect(() => {
    if (context) {
      setSelectedRole(context.role);
      setNiche(context.niche ?? "");
      setSelectedTopics(context.topics ?? []);
    }
  }, [context]);

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

  const handleSave = () => {
    saveContext({
      role: selectedRole,
      niche: niche || null,
      topics: selectedTopics,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Context
        </h1>
        <p className="text-gray-500 mt-1">
          Tell OpenClaw about yourself so it helps you create content that fits you.
        </p>
      </div>

      {/* Role */}
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">
          What best describes you?
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          OpenClaw adapts its content strategy to your role.
        </p>

        <div className="space-y-2">
          {roles.map((role) => {
            const isSelected = selectedRole === role.id;
            return (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className={`w-full flex items-center gap-4 rounded-xl border p-4 text-left transition-all cursor-pointer ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    isSelected
                      ? "bg-primary text-white"
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
                      ? "border-primary bg-primary"
                      : "border-gray-300"
                  }`}
                >
                  {isSelected && <Check className="h-3 w-3 text-white" />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Niche & Topics */}
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">
          What do you talk about?
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          OpenClaw needs to know your world to help you create on-brand content.
        </p>

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
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
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
                        ? "bg-primary text-white"
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
                    className="rounded-full px-3.5 py-1.5 text-sm font-medium bg-primary text-white cursor-pointer"
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
                className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          className="bg-primary hover:bg-[#E84A36] text-white"
          disabled={isPending}
        >
          {saved ? (
            <>
              <Check className="h-4 w-4 mr-1.5" />
              Saved
            </>
          ) : isPending ? (
            "Saving..."
          ) : (
            <>
              <Save className="h-4 w-4 mr-1.5" />
              Save context
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
