"use client";

import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import toast from "react-hot-toast";
import {
  ArrowRightIcon,
  GlobeIcon,
  SpinnerGapIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { appRouter } from "@/lib/constants/appRouter";
import useApi from "@/lib/hooks/useApi";
import {
  onboardingStartSchema,
  type OnboardingStatus,
} from "@/lib/schemas/onboarding";

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

  const onSubmit = (data: FormData) => start({ websiteUrl: data.websiteUrl });
  const onError = () =>
    toast.error(form.formState.errors.websiteUrl?.message ?? "Invalid URL");

  return (
    <form onSubmit={form.handleSubmit(onSubmit, onError)}>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          What&apos;s your website?
        </h1>
        <p className="text-gray-500 mt-2">
          We&apos;ll read it to learn your business and how you sound — so your
          posts feel like you.
        </p>
      </div>

      <label
        htmlFor="websiteUrl"
        className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2"
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

      <div className="mt-8 flex justify-end">
        <Button
          type="submit"
          className="bg-primary hover:bg-[#E84A36] text-white"
          disabled={isPending}
        >
          {isPending ? (
            <>
              <SpinnerGapIcon className="h-4 w-4 mr-1.5 animate-spin" />
              Starting…
            </>
          ) : (
            <>
              Continue
              <ArrowRightIcon className="h-4 w-4 ml-1.5" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
