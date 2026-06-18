"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { GlobeIcon, PencilSimpleLineIcon } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { appRouter } from "@/lib/constants/appRouter";
import useApi from "@/lib/hooks/useApi";
import {
  onboardingStartSchema,
  type OnboardingStatus,
} from "@/lib/schemas/onboarding";
import OnboardingShell from "./OnboardingShell";

type Mode = "website" | "description";

const MODES: { value: Mode; label: string }[] = [
  { value: "website", label: "I have a website" },
  { value: "description", label: "Describe my business" },
];

interface Props {
  status: OnboardingStatus | undefined;
  onNext: () => void;
}

export default function Step1Website({ status, onNext }: Props) {
  const { usePost } = useApi();
  const [mode, setMode] = useState<Mode>("website");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Repopulate the saved URL once when the user returns to this step.
  const hydrated = useRef(false);
  useEffect(() => {
    if (hydrated.current || !status?.websiteUrl) return;
    hydrated.current = true;
    setMode("website");
    setWebsiteUrl(status.websiteUrl);
  }, [status?.websiteUrl]);

  const { mutate: start, isPending } = usePost(appRouter.api.onboardingStart, {
    onSuccess: () => onNext(),
    onError: (err: Error) =>
      toast.error(err.message || "Something went wrong. Please try again."),
  });

  // Validate ONLY the active input and send ONLY that field, so the two paths
  // are mutually exclusive (the schema's xor refine guards the server too).
  const handleSubmit = () => {
    setError(null);
    const payload =
      mode === "website"
        ? { websiteUrl: websiteUrl.trim() }
        : { businessDescription: description.trim() };
    const parsed = onboardingStartSchema.safeParse(payload);
    if (!parsed.success) {
      setError(
        parsed.error.issues[0]?.message ?? "Please check your input and retry."
      );
      return;
    }
    start(parsed.data);
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
  };

  return (
    <OnboardingShell
      step={1}
      title="Let's learn about your business"
      subtitle="Give us your website or a quick description — we'll use it to learn what you do and how you sound, so every post sounds like you."
      asForm
      onSubmit={handleSubmit}
      ctaLabel="Continue"
      submittingLabel="Starting…"
      isSubmitting={isPending}
    >
      <div
        role="group"
        aria-label="How would you like to start?"
        className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1"
      >
        {MODES.map((m) => {
          const active = mode === m.value;
          return (
            <button
              key={m.value}
              type="button"
              aria-pressed={active}
              onClick={() => switchMode(m.value)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
                active
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      <p className="mb-3 text-xs text-gray-400">
        Pick whichever&apos;s easier — you only need one.
      </p>

      {mode === "website" ? (
        <>
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
            inputMode="url"
            autoFocus
            placeholder="https://www.yourbusiness.com"
            className="rounded-xl bg-white"
            value={websiteUrl}
            onChange={(e) => {
              setWebsiteUrl(e.target.value);
              if (error) setError(null);
            }}
          />
        </>
      ) : (
        <>
          <label
            htmlFor="businessDescription"
            className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700"
          >
            <PencilSimpleLineIcon className="h-4 w-4" />
            About your business
          </label>
          <textarea
            id="businessDescription"
            autoFocus
            rows={5}
            placeholder="e.g. We're a family-run Italian catering service in Leeds, specializing in homemade lasagna for weddings and events."
            className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (error) setError(null);
            }}
          />
          <p className="mt-1.5 text-xs text-gray-400">
            A sentence or two about what you do and who you serve.
          </p>
        </>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-600" aria-live="polite" role="alert">
          {error}
        </p>
      )}
    </OnboardingShell>
  );
}
