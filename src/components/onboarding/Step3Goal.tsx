"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  SpinnerGapIcon,
} from "@phosphor-icons/react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { appRouter } from "@/lib/constants/appRouter";
import useApi from "@/lib/hooks/useApi";
import {
  ONBOARDING_GOALS,
  type OnboardingGoal,
  type OnboardingStatus,
} from "@/lib/schemas/onboarding";

interface Props {
  status: OnboardingStatus | undefined;
  onBack: () => void;
  onNext: () => void;
}

export default function Step3Goal({ status, onBack, onNext }: Props) {
  const { usePost } = useApi();
  const [selected, setSelected] = useState<OnboardingGoal | null>(null);
  const hydrated = useRef(false);

  // Repopulate the saved goal when the user returns to this step.
  useEffect(() => {
    if (hydrated.current || !status?.goal) return;
    hydrated.current = true;
    setSelected(status.goal);
  }, [status?.goal]);

  const { mutate: save, isPending } = usePost(appRouter.api.onboardingSave, {
    onSuccess: () => onNext(),
    onError: (error: Error) =>
      toast.error(error.message || "Something went wrong."),
  });

  const handleNext = () => {
    if (!selected) return;
    save({ goal: selected, step: 4 });
  };

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          What do you want social to do for you?
        </h1>
        <p className="text-gray-500 mt-2">
          Pick your main goal — we&apos;ll build your content strategy around it.
        </p>
      </div>

      <div className="space-y-3">
        {ONBOARDING_GOALS.map((goal) => {
          const isSelected = selected === goal.value;
          return (
            <button
              key={goal.value}
              type="button"
              onClick={() => setSelected(goal.value)}
              className={`w-full text-left rounded-2xl border px-4 py-3.5 transition-all ${
                isSelected
                  ? "border-[#e8614d] bg-white shadow-[0_0_0_1px_#e8614d,0_2px_6px_rgba(0,0,0,0.05)]"
                  : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {goal.label}
                  </div>
                  <div className="mt-0.5 text-[13px] text-gray-500">
                    {goal.description}
                  </div>
                </div>
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                    isSelected
                      ? "border-[#e8614d] bg-[#e8614d] text-white"
                      : "border-gray-300"
                  }`}
                >
                  {isSelected && <CheckIcon className="h-3 w-3" weight="bold" />}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back
        </button>
        <Button
          type="button"
          className="bg-primary hover:bg-[#E84A36] text-white"
          disabled={!selected || isPending}
          onClick={handleNext}
        >
          {isPending ? (
            <SpinnerGapIcon className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Next
              <ArrowRightIcon className="h-4 w-4 ml-1.5" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
