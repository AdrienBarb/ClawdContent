"use client";

import { useState, useEffect } from "react";
import { appRouter } from "@/lib/constants/appRouter";
import useApi from "@/lib/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RocketIcon,
  LightbulbIcon,
  BriefcaseIcon,
  PencilSimpleIcon,
  MegaphoneIcon,
  CheckIcon,
  FloppyDiskIcon,
  UsersThreeIcon,
  StarIcon,
  ChatCircleDotsIcon,
  EyeIcon,
} from "@phosphor-icons/react";

const roles = [
  {
    id: "solopreneur",
    label: "Solopreneur / Indie Maker",
    description: "I'm building a product and growing my audience.",
    icon: RocketIcon,
  },
  {
    id: "startup_founder",
    label: "Startup Founder",
    description: "I'm raising awareness for my company.",
    icon: LightbulbIcon,
  },
  {
    id: "freelancer",
    label: "Freelancer / Consultant",
    description: "I want to attract clients through content.",
    icon: BriefcaseIcon,
  },
  {
    id: "content_creator",
    label: "Content Creator",
    description: "I'm building a personal brand.",
    icon: PencilSimpleIcon,
  },
  {
    id: "marketing_manager",
    label: "Marketing Manager",
    description: "I handle content for a company.",
    icon: MegaphoneIcon,
  },
];

const goals = [
  {
    id: "get_clients",
    label: "Get clients / Generate leads",
    description: "I want my content to attract prospects and convert them.",
    icon: UsersThreeIcon,
  },
  {
    id: "personal_brand",
    label: "Build my personal brand",
    description: "I want to be recognized as an expert in my field.",
    icon: StarIcon,
  },
  {
    id: "product_awareness",
    label: "Grow awareness for my product",
    description: "I want more people to discover what I'm building.",
    icon: MegaphoneIcon,
  },
  {
    id: "community",
    label: "Build & engage a community",
    description: "I want to create conversations and connections.",
    icon: ChatCircleDotsIcon,
  },
  {
    id: "visibility",
    label: "Stay visible without spending hours",
    description: "I just want a consistent, low-effort presence.",
    icon: EyeIcon,
  },
];

interface ContextData {
  role: string | null;
  niche: string | null;
  topics: string[];
  goal: string | null;
}

export default function ContextPage() {
  const { useGet, usePut } = useApi();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [niche, setNiche] = useState("");
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
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
      setSelectedGoal(context.goal);
    }
  }, [context]);

  const handleSave = () => {
    saveContext({
      role: selectedRole,
      niche: niche || null,
      topics: [],
      goal: selectedGoal,
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
          Tell your AI manager about yourself so it creates content that fits you.
        </p>
      </div>

      {/* Role */}
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">
          What best describes you?
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Your AI manager adapts its content strategy to your role.
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
                  {isSelected && <CheckIcon className="h-3 w-3 text-white" />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Niche & Goal */}
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">
          About you & your goals
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          This helps your AI manager build a strategy tailored to you.
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
            <label className="block text-sm font-medium text-gray-700 mb-3">
              What&apos;s your #1 goal on social media?
            </label>
            <div className="space-y-2">
              {goals.map((goal) => {
                const isSelected = selectedGoal === goal.id;
                return (
                  <button
                    key={goal.id}
                    onClick={() => setSelectedGoal(goal.id)}
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
                      <goal.icon className="h-5 w-5" />
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">
                        {goal.label}
                      </p>
                      <p className="text-xs text-gray-500">
                        {goal.description}
                      </p>
                    </div>
                    <span
                      className={`h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center ${
                        isSelected
                          ? "border-primary bg-primary"
                          : "border-gray-300"
                      }`}
                    >
                      {isSelected && (
                        <CheckIcon className="h-3 w-3 text-white" />
                      )}
                    </span>
                  </button>
                );
              })}
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
              <CheckIcon className="h-4 w-4 mr-1.5" />
              Saved
            </>
          ) : isPending ? (
            "Saving..."
          ) : (
            <>
              <FloppyDiskIcon className="h-4 w-4 mr-1.5" />
              Save context
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
