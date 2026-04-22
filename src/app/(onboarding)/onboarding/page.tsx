"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { appRouter } from "@/lib/constants/appRouter";
import useApi from "@/lib/hooks/useApi";
import {
  ArrowRightIcon,
  CheckIcon,
  RocketIcon,
  LightbulbIcon,
  BriefcaseIcon,
  PencilSimpleIcon,
  MegaphoneIcon,
  UsersThreeIcon,
  StarIcon,
  ChatCircleDotsIcon,
  EyeIcon,
} from "@phosphor-icons/react";

const roles = [
  { id: "solopreneur", label: "Solopreneur / Indie Maker", description: "I'm building a product and growing my audience.", icon: RocketIcon },
  { id: "startup_founder", label: "Startup Founder", description: "I'm raising awareness for my company.", icon: LightbulbIcon },
  { id: "freelancer", label: "Freelancer / Consultant", description: "I want to attract clients through content.", icon: BriefcaseIcon },
  { id: "content_creator", label: "Content Creator", description: "I'm building a personal brand.", icon: PencilSimpleIcon },
  { id: "marketing_manager", label: "Marketing Manager", description: "I handle content for a company.", icon: MegaphoneIcon },
];

const goals = [
  { id: "get_clients", label: "Get clients / Generate leads", description: "I want my content to attract prospects and convert them.", icon: UsersThreeIcon },
  { id: "personal_brand", label: "Build my personal brand", description: "I want to be recognized as an expert in my field.", icon: StarIcon },
  { id: "product_awareness", label: "Grow awareness for my product", description: "I want more people to discover what I'm building.", icon: MegaphoneIcon },
  { id: "community", label: "Build & engage a community", description: "I want to create conversations and connections.", icon: ChatCircleDotsIcon },
  { id: "visibility", label: "Stay visible without spending hours", description: "I just want a consistent, low-effort presence.", icon: EyeIcon },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { usePost } = useApi();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [niche, setNiche] = useState("");
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);

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
      goal: selectedGoal ?? undefined,
    });
  };

  const handleSkip = () => {
    saveOnboarding({});
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4">
      {/* Skip */}
      <div className="w-full max-w-lg mb-8">
        <div className="flex items-center justify-end">
          <button
            onClick={handleSkip}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            disabled={isPending}
          >
            Skip — you can update this later
          </button>
        </div>
      </div>

      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            Better context, better posts
          </h1>
          <p className="text-gray-500 mt-2">
            PostClaw helps you create and publish content across 13+
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
                      <p className="text-xs text-gray-500">
                        {role.description}
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
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              rows={3}
              maxLength={200}
            />
            <p className="text-xs text-gray-400 mt-1 text-right">
              {niche.length}/200
            </p>
          </div>

          {/* Goal */}
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

        <div className="mt-8 flex justify-end">
          <Button
            onClick={handleFinish}
            className="bg-primary hover:bg-[#E84A36] text-white"
            disabled={isPending}
          >
            {isPending ? "Setting up..." : "Finish setup"}
            {!isPending && <ArrowRightIcon className="h-4 w-4 ml-1.5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
