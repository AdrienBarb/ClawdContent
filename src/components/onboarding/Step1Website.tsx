"use client";

import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import toast from "react-hot-toast";
import { GlobeIcon } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { appRouter } from "@/lib/constants/appRouter";
import useApi from "@/lib/hooks/useApi";
import {
  onboardingStartSchema,
  type OnboardingStatus,
} from "@/lib/schemas/onboarding";
import OnboardingShell from "./OnboardingShell";

type FormData = z.infer<typeof onboardingStartSchema>;

interface Props {
  status: OnboardingStatus | undefined;
  onNext: () => void;
}

export default function Step1Website({ status, onNext }: Props) {
  const { usePost } = useApi();
  const form = useForm<FormData>({
    resolver: zodResolver(onboardingStartSchema),
    defaultValues: { websiteUrl: "" },
  });

  // Repopulate the saved URL when the user returns to this step. Hydrate once
  // and only if untouched, so polling/edits aren't clobbered.
  const hydrated = useRef(false);
  useEffect(() => {
    if (hydrated.current || !status?.websiteUrl) return;
    hydrated.current = true;
    if (!form.formState.isDirty) form.reset({ websiteUrl: status.websiteUrl });
  }, [status?.websiteUrl, form]);

  const { mutate: start, isPending } = usePost(appRouter.api.onboardingStart, {
    onSuccess: () => onNext(),
    onError: (error: Error) =>
      toast.error(error.message || "Something went wrong. Please try again."),
  });

  const onValid = (data: FormData) => start({ websiteUrl: data.websiteUrl });
  const onInvalid = () =>
    toast.error(form.formState.errors.websiteUrl?.message ?? "Invalid URL");

  return (
    <OnboardingShell
      step={1}
      title="Let's start with your website"
      subtitle="Drop in your link and we'll read your site to learn what you do and how you sound. That way every post we write sounds like you."
      asForm
      onSubmit={form.handleSubmit(onValid, onInvalid)}
      ctaLabel="Continue"
      submittingLabel="Starting…"
      isSubmitting={isPending}
    >
      <label
        htmlFor="websiteUrl"
        className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700"
      >
        <GlobeIcon className="h-4 w-4" />
        Your website
      </label>
      <Input
        id="websiteUrl"
        type="url"
        autoFocus
        placeholder="https://www.yourbusiness.com"
        className="rounded-xl bg-white"
        {...form.register("websiteUrl")}
      />
    </OnboardingShell>
  );
}
