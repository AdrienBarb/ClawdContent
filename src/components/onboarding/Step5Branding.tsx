"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  SpinnerGapIcon,
} from "@phosphor-icons/react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import BrandingEditor from "@/components/onboarding/BrandingEditor";
import { appRouter } from "@/lib/constants/appRouter";
import useApi from "@/lib/hooks/useApi";
import type { OnboardingStatus } from "@/lib/schemas/onboarding";
import type { Branding } from "@/lib/schemas/knowledgeBase";
import FormField from "./FormField";

interface Props {
  status: OnboardingStatus | undefined;
  onBack: () => void;
  onNext: () => void;
}

export default function Step5Branding({ status, onBack, onNext }: Props) {
  const { usePost } = useApi();
  const [branding, setBranding] = useState<Branding>({});
  const [tone, setTone] = useState("");
  const [audience, setAudience] = useState("");
  const [style, setStyle] = useState("");
  const [tagline, setTagline] = useState("");
  const hydrated = useRef(false);

  const sourceBranding =
    status?.knowledgeBase?.branding ??
    status?.websiteAnalysis?.draft?.branding ??
    null;
  // Don't hydrate until a real source exists (confirmed KB, a completed
  // draft, or a failed analysis) — otherwise an early poll locks the editor
  // to empty and the extracted brand is lost when it arrives.
  const sourceReady =
    !!status?.knowledgeBase ||
    !!status?.websiteAnalysis?.draft ||
    status?.websiteAnalysis?.status === "failed";

  useEffect(() => {
    if (hydrated.current || !sourceReady) return;
    hydrated.current = true;
    const b = sourceBranding ?? {};
    setBranding(b);
    setTone(b.voice?.tone ?? "");
    setAudience(b.voice?.audience ?? "");
    setStyle((b.styleAdjectives ?? []).join(", "));
    setTagline(b.tagline ?? "");
  }, [sourceReady, sourceBranding]);

  const { mutate: save, isPending } = usePost(appRouter.api.onboardingSave, {
    onSuccess: () => onNext(),
    onError: (error: Error) =>
      toast.error(error.message || "Something went wrong."),
  });

  const handleSave = () =>
    save({
      branding,
      voiceProfile: { tone, audience, style, tagline },
      step: 6,
    });

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Your brand
        </h1>
        <p className="text-gray-500 mt-2">
          We picked up your look and voice. Tweak anything that&apos;s off so
          your posts feel on-brand.
        </p>
      </div>

      <div className="space-y-6">
        <BrandingEditor value={branding} onChange={setBranding} />

        <FormField
          label="Tone of voice"
          placeholder="e.g. Warm and conversational, speaks directly to busy parents"
          multiline
          value={tone}
          onChange={(e) => setTone(e.target.value)}
        />
        <FormField
          label="Who you speak to"
          placeholder="e.g. Couples planning their wedding in Yorkshire"
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
        />
        <FormField
          label="Brand style"
          placeholder="e.g. playful, premium, down-to-earth"
          hint="Separate with commas"
          value={style}
          onChange={(e) => setStyle(e.target.value)}
        />
        <FormField
          label="Tagline"
          placeholder="e.g. Real food, made with love"
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
        />
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
          disabled={isPending}
          onClick={handleSave}
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
