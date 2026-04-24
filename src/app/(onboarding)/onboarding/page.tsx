"use client";

import { useState } from "react";
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
} from "@phosphor-icons/react";
import type { KnowledgeBase } from "@/lib/schemas/knowledgeBase";

type Step = "input" | "validate";

const inputSchema = z
  .object({
    websiteUrl: z.string().url("Please enter a valid URL (e.g. https://www.yourbusiness.com)").or(z.literal("")),
    businessDescription: z.string().max(1000).optional(),
  })
  .refine((data) => data.websiteUrl || data.businessDescription, {
    message: "Please provide a website URL or a business description",
  });

type InputFormData = z.infer<typeof inputSchema>;

const validateSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  description: z.string().min(1, "Description is required"),
  services: z.string().optional(),
});

type ValidateFormData = z.infer<typeof validateSchema>;

export default function OnboardingPage() {
  const router = useRouter();
  const { usePost } = useApi();

  const [step, setStep] = useState<Step>("input");
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBase | null>(null);

  // Step 1 form
  const inputForm = useForm<InputFormData>({
    resolver: zodResolver(inputSchema),
    defaultValues: { websiteUrl: "", businessDescription: "" },
  });

  // Step 2 form
  const validateForm = useForm<ValidateFormData>({
    resolver: zodResolver(validateSchema),
  });

  const { mutate: analyze, isPending: isAnalyzing } = usePost(
    appRouter.api.onboardingAnalyze,
    {
      onSuccess: (data: { knowledgeBase: KnowledgeBase }) => {
        setKnowledgeBase(data.knowledgeBase);
        validateForm.reset({
          businessName: data.knowledgeBase.businessName,
          description: data.knowledgeBase.description,
          services: data.knowledgeBase.services.join(", "),
        });
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
        router.push(appRouter.dashboard);
      },
      onError: (error: Error) => {
        toast.error(error.message || "Failed to save. Please try again.");
      },
    }
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
      businessName: data.businessName,
      description: data.description,
      services: (data.services ?? "").split(",").map((s) => s.trim()).filter(Boolean),
      source: knowledgeBase?.source ?? "manual",
    };
    confirm({
      websiteUrl: inputForm.getValues("websiteUrl") || undefined,
      businessDescription: inputForm.getValues("businessDescription") || undefined,
      knowledgeBase: kb,
    });
  };

  const onValidateError = () => {
    const errors = validateForm.formState.errors;
    const firstError = Object.values(errors).find((e) => e?.message)?.message;
    if (firstError) toast.error(firstError);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-lg">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {(["input", "validate"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`h-2 w-8 rounded-full transition-colors ${
                  s === step
                    ? "bg-primary"
                    : (["input", "validate"].indexOf(s) <
                        ["input", "validate"].indexOf(step))
                      ? "bg-primary/40"
                      : "bg-gray-200"
                }`}
              />
              {i < 1 && <div className="w-1" />}
            </div>
          ))}
        </div>

        {/* Step 1: Business Input */}
        {step === "input" && (
          <form onSubmit={inputForm.handleSubmit(handleAnalyze, onInputError)}>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
                Tell us about your business
              </h1>
              <p className="text-gray-500 mt-2">
                Share your website or describe what you do. We&apos;ll use this
                to create posts that sound like you.
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
                  {...inputForm.register("websiteUrl")}
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
                  {...inputForm.register("businessDescription")}
                />
                <p className="text-xs text-gray-400 mt-1 text-right">
                  {(inputForm.watch("businessDescription") ?? "").length}/1000
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
        )}

        {/* Step 2: Validate */}
        {step === "validate" && (
          <form onSubmit={validateForm.handleSubmit(handleConfirm, onValidateError)}>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
                Here&apos;s what we understood
              </h1>
              <p className="text-gray-500 mt-2">
                Check that everything looks right. You can edit any field.
              </p>
            </div>

            <div className="space-y-4">
              <FormField label="Business name" placeholder="e.g. Casa Lasagna" multiline={false} {...validateForm.register("businessName")} />
              <FormField label="Description" placeholder="e.g. Italian catering service specializing in homemade lasagna for events" multiline {...validateForm.register("description")} />
              <FormField label="Services" placeholder="e.g. Event catering, Private dining, Cooking classes" hint="Separate with commas" multiline={false} {...validateForm.register("services")} />
            </div>

            <div className="mt-8 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep("input")}
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
        )}

      </div>
    </div>
  );
}

import React from "react";

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
