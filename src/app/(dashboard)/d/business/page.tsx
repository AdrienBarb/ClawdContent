"use client";

import { useState, useEffect } from "react";
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

export default function BusinessPage() {
  const { useGet, usePost } = useApi();

  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBase | null>(
    null
  );
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [loaded, setLoaded] = useState(false);

  const { data: statusData } = useGet(appRouter.api.dashboardStatus);

  // Load current knowledgeBase from user data
  useEffect(() => {
    if (!statusData || loaded) return;
    const status = statusData as {
      knowledgeBase?: KnowledgeBase;
      websiteUrl?: string;
    };
    if (status.knowledgeBase) {
      const kb = status.knowledgeBase as Partial<KnowledgeBase>;
      setKnowledgeBase({
        businessName: kb.businessName ?? "",
        description: kb.description ?? "",
        services: kb.services ?? [],
        source: kb.source ?? "legacy",
      });
    }
    if (status.websiteUrl) {
      setWebsiteUrl(status.websiteUrl);
    }
    setLoaded(true);
  }, [statusData, loaded]);

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
    if (!knowledgeBase) return;
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
    if (!knowledgeBase) return;
    setKnowledgeBase({ ...knowledgeBase, [field]: value });
  };

  if (!loaded) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-gray-900">My Business</h1>
        <div className="animate-pulse space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!knowledgeBase) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-gray-900">My Business</h1>
        <p className="text-gray-500">
          No business info yet. Complete the setup from the onboarding.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">My Business</h1>
        <p className="text-sm text-gray-500 mt-1">
          This information helps the AI create posts that match your business.
        </p>
      </div>

      {/* Re-analyze from website */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
          <GlobeIcon className="h-4 w-4" />
          Website URL
        </label>
        <div className="flex gap-2">
          <Input
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://www.yourbusiness.com"
            className="rounded-xl flex-1 bg-white"
          />
          <Button
            variant="outline"
            onClick={handleReAnalyze}
            disabled={!websiteUrl || isReAnalyzing}
            className="rounded-xl"
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
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
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
        <Button
          onClick={handleSave}
          className="bg-primary hover:bg-[#E84A36] text-white"
          disabled={isSaving}
        >
          {isSaving ? (
            <SpinnerGapIcon className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <FloppyDiskIcon className="h-4 w-4 mr-1.5" />
          )}
          Save changes
        </Button>
      </div>
    </div>
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
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          rows={3}
        />
      ) : (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="rounded-xl bg-white"
        />
      )}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}
