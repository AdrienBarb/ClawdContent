"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { appRouter } from "@/lib/constants/appRouter";
import useApi from "@/lib/hooks/useApi";
import toast from "react-hot-toast";
import {
  SpinnerGapIcon,
  GlobeIcon,
  FloppyDiskIcon,
} from "@phosphor-icons/react";
import type { KnowledgeBase } from "@/lib/schemas/knowledgeBase";

interface Props {
  initialKnowledgeBase: KnowledgeBase;
  initialWebsiteUrl: string;
}

export default function BusinessForm({
  initialKnowledgeBase,
  initialWebsiteUrl,
}: Props) {
  const { usePost } = useApi();
  const [knowledgeBase, setKnowledgeBase] =
    useState<KnowledgeBase>(initialKnowledgeBase);
  const [websiteUrl, setWebsiteUrl] = useState(initialWebsiteUrl);

  const { mutate: save, isPending: isSaving } = usePost(
    appRouter.api.onboardingConfirm,
    {
      onSuccess: () => {
        toast.success("Business info saved");
      },
    }
  );

  const { mutate: reAnalyze, isPending: isReAnalyzing } = usePost(
    appRouter.api.onboardingAnalyze,
    {
      onSuccess: (data: { knowledgeBase: KnowledgeBase }) => {
        setKnowledgeBase(data.knowledgeBase);
        toast.success("Website re-analyzed");
      },
      onError: (error: Error) => {
        toast.error(error.message || "Failed to analyze website");
      },
    }
  );

  const handleSave = () => {
    save({
      websiteUrl: websiteUrl || undefined,
      knowledgeBase,
    });
  };

  const handleReAnalyze = () => {
    if (!websiteUrl) return;
    reAnalyze({ websiteUrl });
  };

  const updateField = (
    field: keyof KnowledgeBase,
    value: string | string[]
  ) => {
    setKnowledgeBase({ ...knowledgeBase, [field]: value });
  };

  return (
    <>
      {/* Re-analyze from website */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
          <GlobeIcon className="h-4 w-4" />
          Website URL
        </label>
        <div className="flex gap-2">
          <Input
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://www.yourbusiness.com"
            className="flex-1 rounded-lg bg-white"
          />
          <Button
            variant="outline"
            onClick={handleReAnalyze}
            disabled={!websiteUrl || isReAnalyzing}
            className="rounded-lg"
          >
            {isReAnalyzing ? (
              <SpinnerGapIcon className="h-4 w-4 animate-spin" />
            ) : (
              "Re-analyze"
            )}
          </Button>
        </div>
      </div>

      {/* Editable fields */}
      <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
        <Field
          label="Business name"
          value={knowledgeBase.businessName}
          onChange={(v) => updateField("businessName", v)}
          placeholder="e.g. Casa Lasagna"
        />
        <Field
          label="Description"
          value={knowledgeBase.description}
          onChange={(v) => updateField("description", v)}
          multiline
          placeholder="e.g. Italian catering service specializing in homemade lasagna for events"
        />
        <Field
          label="Services"
          value={knowledgeBase.services.join(", ")}
          onChange={(v) =>
            updateField(
              "services",
              v
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            )
          }
          hint="Separate with commas"
          placeholder="e.g. Event catering, Private dining, Cooking classes"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg px-4 text-sm font-medium text-white transition-all cursor-pointer disabled:opacity-50"
          style={{
            background: "linear-gradient(180deg, #ec6f5b 0%, #c84a35 100%)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 2px rgba(200,74,53,0.25)",
          }}
        >
          {isSaving ? (
            <SpinnerGapIcon className="h-4 w-4 animate-spin" />
          ) : (
            <FloppyDiskIcon className="h-4 w-4" />
          )}
          Save changes
        </button>
      </div>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline = false,
  hint,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  hint?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          rows={3}
        />
      ) : (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="rounded-lg bg-white"
        />
      )}
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}
