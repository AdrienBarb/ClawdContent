"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { appRouter } from "@/lib/constants/appRouter";
import useApi from "@/lib/hooks/useApi";
import type { KnowledgeBase } from "@/lib/schemas/knowledgeBase";
import type { BrandIdentity } from "@/lib/schemas/brandIdentity";

import { StepIndicator } from "./_components/StepIndicator";
import type { Step } from "./_components/types";
import {
  InputStep,
  inputSchema,
  type InputFormData,
} from "./_components/InputStep";
import {
  ValidateStep,
  validateSchema,
  type ValidateFormData,
} from "./_components/ValidateStep";
import { BrandStep } from "./_components/BrandStep";
import { ConnectStep } from "./_components/ConnectStep";

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

  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [brandError, setBrandError] = useState<string | null>(null);

  // Forms live in the parent so values survive Back navigation between steps.
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
        setAnalyzeError(null);
        setKnowledgeBase(data.knowledgeBase);
        validateForm.reset({
          businessName: data.knowledgeBase.businessName,
          description: data.knowledgeBase.description,
          services: data.knowledgeBase.services.join(", "),
        });
        setExtractedBrand(data.brandIdentity);
        setStep("validate");
      },
      onError: (error: Error) => {
        const msg = error.message || "Something went wrong. Please try again.";
        setAnalyzeError(msg);
        toast.error(msg);
      },
    }
  );

  const { mutate: confirm, isPending: isConfirming } = usePost(
    appRouter.api.onboardingConfirm,
    {
      onSuccess: () => {
        setConfirmError(null);
        setStep("brand");
      },
      onError: (error: Error) => {
        const msg = error.message || "Failed to save. Please try again.";
        setConfirmError(msg);
        toast.error(msg);
      },
    }
  );

  const { mutate: saveBrand, isPending: isSavingBrand } = usePost(
    appRouter.api.onboardingBrandIdentity,
    {
      onSuccess: () => {
        setBrandError(null);
        setStep("connect");
      },
      onError: (error: Error) => {
        const msg =
          error.message || "Couldn't save your brand. Please try again.";
        setBrandError(msg);
        toast.error(msg);
      },
    }
  );

  const accountsQuery = useGet<{ accounts: ConnectedAccount[] }>(
    appRouter.api.accounts,
    undefined,
    { enabled: step === "connect", refetchOnMount: "always" }
  );

  const connectedPlatformIds = useMemo(
    () => (accountsQuery.data?.accounts ?? []).map((a) => a.platform),
    [accountsQuery.data]
  );

  const accountsError = accountsQuery.error
    ? "We couldn't load your connected accounts. Check your connection and try again."
    : null;

  const handleAnalyzeSubmit = (data: InputFormData) => {
    analyze({
      websiteUrl: data.websiteUrl || undefined,
      businessDescription: data.businessDescription || undefined,
    });
  };

  const handleAnalyzeRetry = () => {
    setAnalyzeError(null);
    inputForm.handleSubmit(handleAnalyzeSubmit)();
  };

  const onAnalyzeInputError = () => {
    const errors = inputForm.formState.errors;
    const firstError =
      errors.websiteUrl?.message ||
      errors.businessDescription?.message ||
      errors.root?.message;
    if (firstError) toast.error(firstError);
  };

  const handleConfirmSubmit = (data: ValidateFormData) => {
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

  const handleConfirmRetry = () => {
    setConfirmError(null);
    validateForm.handleSubmit(handleConfirmSubmit)();
  };

  const onConfirmError = () => {
    const errors = validateForm.formState.errors;
    const firstError = Object.values(errors).find((e) => e?.message)?.message;
    if (firstError) toast.error(firstError);
  };

  const handleSaveBrand = (brand: BrandIdentity) => {
    saveBrand({ brandIdentity: brand });
  };

  const handleFinishOnboarding = () => {
    if (connectedPlatformIds.length === 0) {
      toast.error("Connect at least one account to continue.");
      return;
    }
    // Steps 1-4 done — kick the user into the Stripe trial checkout. The
    // success URL is computed server-side from the user's connected accounts
    // (skipping v1-disabled platforms like TikTok / YouTube).
    router.push(appRouter.onboardingCheckout);
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        <StepIndicator current={step} />

        {step === "input" && (
          <InputStep
            form={inputForm}
            isAnalyzing={isAnalyzing}
            error={analyzeError}
            onSubmit={inputForm.handleSubmit(
              handleAnalyzeSubmit,
              onAnalyzeInputError
            )}
            onRetry={handleAnalyzeRetry}
          />
        )}

        {step === "validate" && (
          <ValidateStep
            form={validateForm}
            isConfirming={isConfirming}
            error={confirmError}
            onSubmit={validateForm.handleSubmit(
              handleConfirmSubmit,
              onConfirmError
            )}
            onBack={() => setStep("input")}
            onRetry={handleConfirmRetry}
          />
        )}

        {step === "brand" && (
          <BrandStep
            extracted={extractedBrand}
            isSaving={isSavingBrand}
            error={brandError}
            onBack={() => setStep("validate")}
            onSave={handleSaveBrand}
            onRetry={() => setBrandError(null)}
          />
        )}

        {step === "connect" && (
          <ConnectStep
            connectedPlatformIds={connectedPlatformIds}
            isLoading={accountsQuery.isLoading}
            error={accountsError}
            onAccountConnected={() => accountsQuery.refetch()}
            onBack={() => setStep("brand")}
            onContinue={handleFinishOnboarding}
            onRetry={() => accountsQuery.refetch()}
          />
        )}
      </div>
    </div>
  );
}
