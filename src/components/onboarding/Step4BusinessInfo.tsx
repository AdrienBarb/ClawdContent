"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { ArrowClockwiseIcon, SpinnerGapIcon } from "@phosphor-icons/react";
import toast from "react-hot-toast";
import { appRouter } from "@/lib/constants/appRouter";
import { serverErrorMessage } from "@/lib/api/serverError";
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
  /** Re-read /api/onboarding/status — used after "Try again" re-fires analysis. */
  onRefetch: () => void;
}

// How long to wait before offering the manual fallback. The job is self-healing
// (a transient scrape retries, onFailure always lands a terminal "failed"), so
// these only cover the case the client genuinely can't observe: a dropped event
// leaving the job stuck. We never declare a "running" job dead — it's alive and
// the server guarantees it terminates — but cap total patience so a stalled
// worker can't trap the user on the skeleton. Measured from when THIS client
// started waiting (reset on retry): no server time on the client, so no
// clock-skew failure modes.
const PENDING_SLOW_MS = 60_000;
const RUNNING_PATIENCE_MS = 120_000;

export default function Step4BusinessInfo({
  status,
  onBack,
  onNext,
  onRefetch,
}: Props) {
  const { usePost } = useApi();
  const form = useForm<FormData>({
    defaultValues: { businessName: "", description: "", services: "" },
  });
  const hydrated = useRef(false);

  // When this client started waiting for the current attempt; reset on "Try
  // again" so the patience window restarts for the fresh job.
  const waitStartedAt = useRef(Date.now());
  const [, forceRender] = useReducer((n: number) => n + 1, 0);
  // True from a "Try again" click until the fresh job is observed — keeps the
  // skeleton up so the stale failed/slow state never flashes mid-retry.
  const [retrying, setRetrying] = useState(false);

  const kb = status?.knowledgeBase ?? null;
  const analysis = status?.websiteAnalysis ?? null;
  const source = kb ?? analysis?.draft ?? null;
  const analysisStatus = analysis?.status;

  const isFailed = !source && analysisStatus === "failed";
  const inFlight =
    !analysis || analysisStatus === "pending" || analysisStatus === "running";
  const patienceMs =
    analysisStatus === "running" ? RUNNING_PATIENCE_MS : PENDING_SLOW_MS;
  const elapsed = Date.now() - waitStartedAt.current;
  const isWaiting = !source && !isFailed && inFlight && elapsed < patienceMs;
  // Neutral "taking longer than expected" — likely a dropped event. Offer the
  // manual form + retry rather than a scary error.
  const isSlow = !source && !isFailed && inFlight && elapsed >= patienceMs;
  const manualMode = isFailed || isSlow;

  // The no-website path clears websiteUrl, so this distinguishes the two sources
  // for the review copy (the description path was never "your website").
  const usedWebsite = !!status?.websiteUrl;

  // Force a single re-render exactly at the patience boundary so isWaiting flips
  // to isSlow even if polling has already stopped (stalled worker). One timer,
  // not a per-second tick.
  useEffect(() => {
    if (source || isFailed || isSlow) return;
    const remaining = patienceMs - (Date.now() - waitStartedAt.current);
    if (remaining <= 0) return;
    const id = setTimeout(forceRender, remaining);
    return () => clearTimeout(id);
  }, [source, isFailed, isSlow, patienceMs]);

  // Clear the retry bridge once the fresh job (or a result) is observed.
  useEffect(() => {
    if (!retrying) return;
    if (source || analysisStatus === "pending" || analysisStatus === "running") {
      setRetrying(false);
    }
  }, [retrying, source, analysisStatus]);

  // Prefill once, when the analysis result (or saved KB) first arrives. Skip if
  // the user has already started editing — so a late result (a slow job that
  // landed after the manual form appeared) never clobbers their input.
  const isDirty = form.formState.isDirty;
  useEffect(() => {
    if (hydrated.current || !source || isDirty) return;
    hydrated.current = true;
    form.reset({
      businessName: source.businessName ?? "",
      description: source.description ?? "",
      services: (source.services ?? []).join(", "),
    });
  }, [source, isDirty, form]);

  // "Try again" re-fires the same analysis (rate-limited server-side). The saved
  // source comes back on the status payload, so the user never retypes it.
  const retryPayload = status?.websiteUrl
    ? { websiteUrl: status.websiteUrl }
    : status?.businessDescription
      ? { businessDescription: status.businessDescription }
      : null;

  const { mutate: retry } = usePost(appRouter.api.onboardingStart, {
    onSuccess: () => {
      // Fresh attempt: restart the wait clock, clear the form so the new result
      // hydrates cleanly, and resume polling (the server reset analysis to
      // "pending").
      waitStartedAt.current = Date.now();
      hydrated.current = false;
      form.reset({ businessName: "", description: "", services: "" });
      onRefetch();
    },
    onError: (err: Error) => {
      setRetrying(false);
      toast.error(
        serverErrorMessage(err, "Couldn't retry just now — try again in a moment.")
      );
    },
  });

  const handleRetry = () => {
    if (!retryPayload) return;
    setRetrying(true);
    retry(retryPayload);
  };

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

  // Polling skeleton while the website analysis runs (or a retry is firing) —
  // inside the same frame so the wizard never resizes or jumps.
  if (isWaiting || retrying) {
    return (
      <OnboardingShell
        step={4}
        title="Analyzing your business…"
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

  const bannerText = isFailed
    ? "We couldn't pull this in automatically. Add the basics below"
    : "This is taking longer than expected. Add the basics below";

  return (
    <OnboardingShell
      step={4}
      title={manualMode ? "Tell us about your business" : "Here's what we learned about you"}
      subtitle={
        manualMode
          ? "Add the basics yourself — it only takes a minute."
          : usedWebsite
            ? "We pulled this from your website. Have a look and fix anything that's not quite right."
            : "Based on what you told us. Have a look and fix anything that's not quite right."
      }
      onBack={onBack}
      asForm
      onSubmit={form.handleSubmit(onSubmit)}
      ctaLabel="Continue"
      isSubmitting={isPending}
    >
      {manualMode && (
        <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          <span>{retryPayload ? `${bannerText}, or try again.` : `${bannerText}.`}</span>
          {retryPayload && (
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-100"
            >
              <ArrowClockwiseIcon className="h-3.5 w-3.5" />
              Try again
            </button>
          )}
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
