"use client";

import React, { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { appRouter } from "@/lib/constants/appRouter";
import useApi from "@/lib/hooks/useApi";
import toast from "react-hot-toast";
import {
  ArrowRightIcon,
  ArrowLeftIcon,
  SpinnerGapIcon,
  GlobeIcon,
  PencilSimpleIcon,
  CheckCircleIcon,
  ImageIcon,
  UploadSimpleIcon,
} from "@phosphor-icons/react";
import type { KnowledgeBase } from "@/lib/schemas/knowledgeBase";
import type { BrandIdentity } from "@/lib/schemas/brandIdentity";
import { brandIdentitySchema } from "@/lib/schemas/brandIdentity";
import ConnectAccountButtons from "@/components/dashboard/ConnectAccountButtons";
import { useCloudinaryUpload } from "@/lib/hooks/useCloudinaryUpload";

type Step = "input" | "validate" | "brand" | "connect";
const STEPS: Step[] = ["input", "validate", "brand", "connect"];

const inputSchema = z
  .object({
    websiteUrl: z
      .string()
      .url("Please enter a valid URL (e.g. https://www.yourbusiness.com)")
      .or(z.literal("")),
    businessDescription: z.string().max(1000).optional(),
  })
  .refine((data) => data.websiteUrl || data.businessDescription, {
    message: "Please provide a website URL or a business description",
  });

type InputFormData = z.infer<typeof inputSchema>;

const validateSchema = z.object({
  businessName: z.string().optional(),
  description: z.string().optional(),
  services: z.string().optional(),
});

type ValidateFormData = z.infer<typeof validateSchema>;

const DEFAULT_BRAND: BrandIdentity = {
  logoUrl: null,
  primaryColor: "#ec6f5b",
  secondaryColor: "#2d2a25",
  accentColor: null,
  brandPhotos: [],
  styleNotes: null,
};

interface ConnectedAccount {
  id: string;
  platform: string;
}

export default function OnboardingClient() {
  const router = useRouter();
  const { usePost, useGet } = useApi();

  const [step, setStep] = useState<Step>("input");
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBase | null>(null);
  const [extractedBrand, setExtractedBrand] = useState<BrandIdentity | null>(
    null
  );
  const [brandMode, setBrandMode] = useState<"preview" | "manual">("preview");
  const [brandDraft, setBrandDraft] = useState<BrandIdentity>(DEFAULT_BRAND);

  const inputForm = useForm<InputFormData>({
    resolver: zodResolver(inputSchema),
    defaultValues: { websiteUrl: "", businessDescription: "" },
  });

  const validateForm = useForm<ValidateFormData>({
    resolver: zodResolver(validateSchema),
  });

  const { mutate: analyze, isPending: isAnalyzing } = usePost(
    appRouter.api.onboardingAnalyze,
    {
      onSuccess: (data: {
        knowledgeBase: KnowledgeBase;
        brandIdentity: BrandIdentity | null;
      }) => {
        setKnowledgeBase(data.knowledgeBase);
        validateForm.reset({
          businessName: data.knowledgeBase.businessName,
          description: data.knowledgeBase.description,
          services: data.knowledgeBase.services.join(", "),
        });
        setExtractedBrand(data.brandIdentity);
        if (data.brandIdentity) {
          setBrandDraft(data.brandIdentity);
          setBrandMode("preview");
        } else {
          setBrandDraft(DEFAULT_BRAND);
          setBrandMode("manual");
        }
        setStep("validate");
      },
      onError: (error: Error) => {
        toast.error(error.message || "Something went wrong. Please try again.");
      },
    }
  );

  const { mutate: confirm, isPending: isConfirming } = usePost(
    appRouter.api.onboardingConfirm,
    {
      onSuccess: () => {
        setStep("brand");
      },
      onError: (error: Error) => {
        toast.error(error.message || "Failed to save. Please try again.");
      },
    }
  );

  const { mutate: saveBrand, isPending: isSavingBrand } = usePost(
    appRouter.api.onboardingBrandIdentity,
    {
      onSuccess: () => {
        setStep("connect");
      },
      onError: (error: Error) => {
        toast.error(
          error.message || "Couldn't save your brand. Please try again."
        );
      },
    }
  );

  const accountsQuery = useGet(
    appRouter.api.accounts,
    undefined,
    { enabled: step === "connect" }
  ) as { data?: { accounts: ConnectedAccount[] }; refetch: () => void };

  const connectedPlatformIds = useMemo(
    () => (accountsQuery.data?.accounts ?? []).map((a) => a.platform),
    [accountsQuery.data]
  );

  const handleAnalyze = (data: InputFormData) => {
    analyze({
      websiteUrl: data.websiteUrl || undefined,
      businessDescription: data.businessDescription || undefined,
    });
  };

  const onInputError = () => {
    const errors = inputForm.formState.errors;
    const firstError =
      errors.websiteUrl?.message ||
      errors.businessDescription?.message ||
      errors.root?.message;
    if (firstError) toast.error(firstError);
  };

  const handleConfirm = (data: ValidateFormData) => {
    const kb: KnowledgeBase = {
      businessName: data.businessName ?? "",
      description: data.description ?? "",
      services: (data.services ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      source: knowledgeBase?.source ?? "manual",
    };
    confirm({
      websiteUrl: inputForm.getValues("websiteUrl") || undefined,
      businessDescription:
        inputForm.getValues("businessDescription") || undefined,
      knowledgeBase: kb,
    });
  };

  const onValidateError = () => {
    const errors = validateForm.formState.errors;
    const firstError = Object.values(errors).find((e) => e?.message)?.message;
    if (firstError) toast.error(firstError);
  };

  const handleSaveBrand = () => {
    const parsed = brandIdentitySchema.safeParse(brandDraft);
    if (!parsed.success) {
      toast.error("Pick a primary and a secondary color before continuing.");
      return;
    }
    saveBrand({ brandIdentity: parsed.data });
  };

  const handleFinishOnboarding = () => {
    if (connectedPlatformIds.length === 0) {
      toast.error("Connect at least one account to continue.");
      return;
    }
    const firstPlatform = connectedPlatformIds[0];
    router.push(`${appRouter.dashboard}/${firstPlatform}`);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <StepIndicator current={step} />

        {step === "input" && (
          <InputStep
            form={inputForm}
            onSubmit={inputForm.handleSubmit(handleAnalyze, onInputError)}
            isAnalyzing={isAnalyzing}
          />
        )}

        {step === "validate" && (
          <ValidateStep
            form={validateForm}
            onSubmit={validateForm.handleSubmit(handleConfirm, onValidateError)}
            onBack={() => setStep("input")}
            isConfirming={isConfirming}
          />
        )}

        {step === "brand" && (
          <BrandStep
            mode={brandMode}
            onSwitchMode={setBrandMode}
            extracted={extractedBrand}
            draft={brandDraft}
            onDraftChange={setBrandDraft}
            onBack={() => setStep("validate")}
            onContinue={handleSaveBrand}
            isSaving={isSavingBrand}
          />
        )}

        {step === "connect" && (
          <ConnectStep
            connectedPlatformIds={connectedPlatformIds}
            onAccountConnected={() => accountsQuery.refetch()}
            onBack={() => setStep("brand")}
            onContinue={handleFinishOnboarding}
          />
        )}
      </div>
    </div>
  );
}

function StepIndicator({ current }: { current: Step }) {
  const currentIndex = STEPS.indexOf(current);
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((s, i) => (
        <React.Fragment key={s}>
          <div
            className={`h-2 w-8 rounded-full transition-colors ${
              s === current
                ? "bg-primary"
                : i < currentIndex
                  ? "bg-primary/40"
                  : "bg-gray-200"
            }`}
          />
          {i < STEPS.length - 1 && <div className="w-1" />}
        </React.Fragment>
      ))}
    </div>
  );
}

function InputStep({
  form,
  onSubmit,
  isAnalyzing,
}: {
  form: ReturnType<typeof useForm<InputFormData>>;
  onSubmit: (e: React.FormEvent) => void;
  isAnalyzing: boolean;
}) {
  return (
    <form onSubmit={onSubmit}>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Tell us about your business
        </h1>
        <p className="text-gray-500 mt-2">
          Share your website or describe what you do. We&apos;ll use this to
          create posts that sound like you.
        </p>
      </div>

      <div className="space-y-6">
        <div>
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
            placeholder="https://www.yourbusiness.com"
            className="rounded-xl bg-white"
            {...form.register("websiteUrl")}
          />
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-background px-2 text-gray-400">
              or describe your business
            </span>
          </div>
        </div>

        <div>
          <label
            htmlFor="businessDescription"
            className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2"
          >
            <PencilSimpleIcon className="h-4 w-4" />
            Business description
          </label>
          <textarea
            id="businessDescription"
            placeholder="e.g. I'm a wedding photographer based in Leeds. I shoot natural, candid moments and work mostly with couples in Yorkshire."
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            rows={4}
            maxLength={1000}
            {...form.register("businessDescription")}
          />
          <p className="text-xs text-gray-400 mt-1 text-right">
            {(form.watch("businessDescription") ?? "").length}/1000
          </p>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <Button
          type="submit"
          className="bg-primary hover:bg-[#E84A36] text-white"
          disabled={isAnalyzing}
        >
          {isAnalyzing ? (
            <>
              <SpinnerGapIcon className="h-4 w-4 mr-1.5 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              Analyze my business
              <ArrowRightIcon className="h-4 w-4 ml-1.5" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

function ValidateStep({
  form,
  onSubmit,
  onBack,
  isConfirming,
}: {
  form: ReturnType<typeof useForm<ValidateFormData>>;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  isConfirming: boolean;
}) {
  return (
    <form onSubmit={onSubmit}>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Here&apos;s what we understood
        </h1>
        <p className="text-gray-500 mt-2">
          Check that everything looks right. You can edit any field.
        </p>
      </div>

      <div className="space-y-4">
        <FormField
          label="Business name"
          placeholder="e.g. Casa Lasagna"
          multiline={false}
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
          multiline={false}
          {...form.register("services")}
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
          type="submit"
          className="bg-primary hover:bg-[#E84A36] text-white"
          disabled={isConfirming}
        >
          {isConfirming ? (
            <>
              <SpinnerGapIcon className="h-4 w-4 mr-1.5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              Looks good
              <CheckCircleIcon className="h-4 w-4 ml-1.5" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

function BrandStep({
  mode,
  onSwitchMode,
  extracted,
  draft,
  onDraftChange,
  onBack,
  onContinue,
  isSaving,
}: {
  mode: "preview" | "manual";
  onSwitchMode: (mode: "preview" | "manual") => void;
  extracted: BrandIdentity | null;
  draft: BrandIdentity;
  onDraftChange: (next: BrandIdentity) => void;
  onBack: () => void;
  onContinue: () => void;
  isSaving: boolean;
}) {
  const showPreview = mode === "preview" && extracted !== null;

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Your brand identity
        </h1>
        <p className="text-gray-500 mt-2">
          We&apos;ll use these colors and your logo to make every post look like
          yours.
        </p>
      </div>

      {showPreview && extracted ? (
        <BrandPreviewCard
          brand={extracted}
          onCustomize={() => {
            onDraftChange(extracted);
            onSwitchMode("manual");
          }}
        />
      ) : (
        <BrandManualForm draft={draft} onChange={onDraftChange} />
      )}

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
          disabled={isSaving}
          onClick={onContinue}
        >
          {isSaving ? (
            <>
              <SpinnerGapIcon className="h-4 w-4 mr-1.5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              {showPreview ? "Looks good" : "Continue"}
              <ArrowRightIcon className="h-4 w-4 ml-1.5" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function BrandPreviewCard({
  brand,
  onCustomize,
}: {
  brand: BrandIdentity;
  onCustomize: () => void;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 overflow-hidden">
          {brand.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brand.logoUrl}
              alt="Brand logo"
              className="h-full w-full object-contain"
            />
          ) : (
            <ImageIcon className="h-6 w-6 text-gray-300" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">
            Picked up from your website
          </p>
          <p className="text-[12px] text-gray-500 mt-0.5">
            {brand.styleNotes ?? "Colors pulled directly from your site."}
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <ColorSwatch label="Primary" color={brand.primaryColor} />
        <ColorSwatch label="Secondary" color={brand.secondaryColor} />
        {brand.accentColor ? (
          <ColorSwatch label="Accent" color={brand.accentColor} />
        ) : (
          <div className="rounded-xl border border-dashed border-gray-200 p-3 text-center text-[11px] text-gray-400">
            No accent
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onCustomize}
        className="mt-4 text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer underline underline-offset-4"
      >
        Customize
      </button>
    </div>
  );
}

function ColorSwatch({ label, color }: { label: string; color: string }) {
  return (
    <div className="rounded-xl border border-gray-200 p-3">
      <div
        className="h-10 w-full rounded-lg border border-gray-100"
        style={{ backgroundColor: color }}
      />
      <p className="mt-2 text-[11px] font-medium text-gray-700">{label}</p>
      <p className="text-[10.5px] font-mono uppercase text-gray-400 tabular-nums">
        {color}
      </p>
    </div>
  );
}

function BrandManualForm({
  draft,
  onChange,
}: {
  draft: BrandIdentity;
  onChange: (next: BrandIdentity) => void;
}) {
  const { upload, uploading } = useCloudinaryUpload();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleLogoSelect = async (file: File | null) => {
    if (!file) return;
    try {
      const items = await upload([file]);
      const first = items[0];
      if (first?.type === "image") {
        onChange({ ...draft, logoUrl: first.url });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Logo
        </label>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
            {draft.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={draft.logoUrl}
                alt="Logo preview"
                className="h-full w-full object-contain"
              />
            ) : (
              <ImageIcon className="h-6 w-6 text-gray-300" />
            )}
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleLogoSelect(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer disabled:opacity-50"
              disabled={uploading}
            >
              {uploading ? (
                <SpinnerGapIcon className="h-4 w-4 animate-spin" />
              ) : (
                <UploadSimpleIcon className="h-4 w-4" />
              )}
              {draft.logoUrl ? "Replace logo" : "Upload logo"}
            </button>
            <p className="text-[11px] text-gray-400 mt-1">
              PNG or SVG, up to 25 MB. Optional.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <HexColorField
          label="Primary"
          value={draft.primaryColor}
          onChange={(v) => onChange({ ...draft, primaryColor: v })}
        />
        <HexColorField
          label="Secondary"
          value={draft.secondaryColor}
          onChange={(v) => onChange({ ...draft, secondaryColor: v })}
        />
        <HexColorField
          label="Accent (optional)"
          value={draft.accentColor ?? ""}
          onChange={(v) =>
            onChange({ ...draft, accentColor: v.length > 0 ? v : null })
          }
          allowEmpty
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Style notes
        </label>
        <textarea
          value={draft.styleNotes ?? ""}
          onChange={(e) =>
            onChange({
              ...draft,
              styleNotes: e.target.value.length > 0 ? e.target.value : null,
            })
          }
          placeholder="e.g. Warm, hand-drawn feel. Avoid stock photography."
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          rows={3}
        />
        <p className="text-[11px] text-gray-400 mt-1">Optional.</p>
      </div>
    </div>
  );
}

const HEX_INPUT = /^#[0-9a-fA-F]{0,6}$/;

function HexColorField({
  label,
  value,
  onChange,
  allowEmpty = false,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  allowEmpty?: boolean;
}) {
  const safeValue = value && HEX_INPUT.test(value) ? value : "";
  const swatchColor = /^#[0-9a-fA-F]{6}$/.test(safeValue)
    ? safeValue
    : "#e5e7eb";

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(safeValue) ? safeValue : "#ec6f5b"}
          onChange={(e) => onChange(e.target.value.toLowerCase())}
          className="h-10 w-10 shrink-0 cursor-pointer rounded-lg border border-gray-200 bg-white"
          aria-label={`${label} color picker`}
        />
        <input
          type="text"
          value={safeValue}
          onChange={(e) => {
            const next = e.target.value;
            if (next === "" && allowEmpty) {
              onChange("");
              return;
            }
            if (HEX_INPUT.test(next) || next === "#") {
              onChange(next.toLowerCase());
            }
          }}
          placeholder="#000000"
          className="flex-1 min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-mono uppercase text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary tabular-nums"
        />
      </div>
      <div
        className="mt-1.5 h-1 w-full rounded-full"
        style={{ backgroundColor: swatchColor }}
      />
    </div>
  );
}

function ConnectStep({
  connectedPlatformIds,
  onAccountConnected,
  onBack,
  onContinue,
}: {
  connectedPlatformIds: string[];
  onAccountConnected: () => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const canContinue = connectedPlatformIds.length > 0;

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Connect your accounts
        </h1>
        <p className="text-gray-500 mt-2">
          Pick at least one to get started. You can add more anytime.
        </p>
      </div>

      <ConnectAccountButtons
        connectedPlatforms={connectedPlatformIds}
        onAccountConnected={onAccountConnected}
        returnTo={appRouter.onboarding}
      />

      <div className="mt-6 text-center text-[12px] text-gray-500">
        {canContinue
          ? `${connectedPlatformIds.length} ${
              connectedPlatformIds.length === 1 ? "account" : "accounts"
            } connected`
          : "Connect at least one account to continue."}
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
          disabled={!canContinue}
          onClick={onContinue}
        >
          Continue
          <ArrowRightIcon className="h-4 w-4 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}

const FormField = React.forwardRef<
  HTMLInputElement | HTMLTextAreaElement,
  {
    label: string;
    multiline?: boolean;
    hint?: string;
  } & React.InputHTMLAttributes<HTMLInputElement> &
    React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ label, multiline = false, hint, ...props }, ref) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>
      {multiline ? (
        <textarea
          ref={ref as React.Ref<HTMLTextAreaElement>}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          rows={5}
          {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <Input
          ref={ref as React.Ref<HTMLInputElement>}
          className="rounded-xl bg-white"
          {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
        />
      )}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
});
FormField.displayName = "FormField";
