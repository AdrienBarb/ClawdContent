"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { SpinnerGapIcon, WarningCircleIcon } from "@phosphor-icons/react";
import toast from "react-hot-toast";
import { appRouter } from "@/lib/constants/appRouter";
import useApi from "@/lib/hooks/useApi";
import type { OnboardingStatus } from "@/lib/schemas/onboarding";
import FormField from "./FormField";
import OnboardingShell from "./OnboardingShell";

interface FormData {
  businessName: string;
  description: string;
  services: string;
}

interface Props {
  status: OnboardingStatus | undefined;
  onBack: () => void;
  onNext: () => void;
}

export default function Step4BusinessInfo({ status, onBack, onNext }: Props) {
  const { usePost } = useApi();
  const form = useForm<FormData>({
    defaultValues: { businessName: "", description: "", services: "" },
  });
  const hydrated = useRef(false);

  // If the background job never lands (Inngest down in dev, dropped event),
  // fall back to manual entry rather than spinning forever.
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setTimedOut(true), 30_000);
    return () => clearTimeout(id);
  }, []);

  const kb = status?.knowledgeBase ?? null;
  const analysis = status?.websiteAnalysis ?? null;
  const source = kb ?? analysis?.draft ?? null;
  const isWaiting =
    !kb &&
    !timedOut &&
    (!analysis ||
      analysis.status === "pending" ||
      analysis.status === "running");
  const isFailed =
    !kb && (analysis?.status === "failed" || (timedOut && !source));

  // Prefill once, when the analysis result (or saved KB) first arrives — so
  // polling doesn't clobber the user's in-progress edits.
  useEffect(() => {
    if (hydrated.current || !source) return;
    hydrated.current = true;
    form.reset({
      businessName: source.businessName ?? "",
      description: source.description ?? "",
      services: (source.services ?? []).join(", "),
    });
  }, [source, form]);

  const { mutate: save, isPending } = usePost(appRouter.api.onboardingSave, {
    onSuccess: () => onNext(),
    onError: (error: Error) =>
      toast.error(error.message || "Something went wrong."),
  });

  const onSubmit = (data: FormData) =>
    save({
      businessName: data.businessName,
      description: data.description,
      services: data.services
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      step: 5,
    });

  // Polling skeleton while the website analysis runs — inside the same frame so
  // the wizard never resizes or jumps.
  if (isWaiting) {
    return (
      <OnboardingShell
        step={4}
        title="Reading your website…"
        subtitle="This only takes a few seconds. Hang tight."
        onBack={onBack}
        onSubmit={() => {}}
        ctaLabel="Continue"
        ctaDisabled
      >
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-24 animate-pulse rounded bg-gray-200" />
              <div className="h-10 w-full animate-pulse rounded-xl bg-gray-100" />
            </div>
          ))}
        </div>
        <p className="mt-6 flex items-center gap-2 text-sm text-gray-400">
          <SpinnerGapIcon className="h-4 w-4 animate-spin" />
          Analyzing your business
        </p>
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell
      step={4}
      title={isFailed ? "Tell us about your business" : "Here's what we learned about you"}
      subtitle={
        isFailed
          ? "We couldn't read your website, so add the basics yourself. It only takes a minute."
          : "We pulled this from your website. Have a look and fix anything that's not quite right."
      }
      onBack={onBack}
      asForm
      onSubmit={form.handleSubmit(onSubmit)}
      ctaLabel="Continue"
      isSubmitting={isPending}
    >
      {isFailed && (
        <div className="mb-5 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <WarningCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
          We couldn&apos;t pull info from your website automatically.
        </div>
      )}

      <div className="space-y-4">
        <FormField
          label="Business name"
          placeholder="e.g. Casa Lasagna"
          {...form.register("businessName")}
        />
        <FormField
          label="Description"
          placeholder="e.g. Italian catering service specializing in homemade lasagna for events"
          multiline
          {...form.register("description")}
        />
        <FormField
          label="Services"
          placeholder="e.g. Event catering, Private dining, Cooking classes"
          hint="Separate with commas"
          {...form.register("services")}
        />
      </div>
    </OnboardingShell>
  );
}
