"use client";

import { z } from "zod";
import type { UseFormReturn } from "react-hook-form";
import {
  ArrowLeftIcon,
  SpinnerGapIcon,
  CheckCircleIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { FormField } from "./FormField";
import { ErrorBanner } from "./ErrorBanner";

export const validateSchema = z.object({
  businessName: z.string().optional(),
  description: z.string().optional(),
  services: z.string().optional(),
});

export type ValidateFormData = z.infer<typeof validateSchema>;

export function ValidateStep({
  form,
  isConfirming,
  error,
  onSubmit,
  onBack,
  onRetry,
}: {
  form: UseFormReturn<ValidateFormData>;
  isConfirming: boolean;
  error: string | null;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  onRetry: () => void;
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

      {error && <ErrorBanner message={error} onRetry={onRetry} />}

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
          className="bg-primary hover:bg-[#c84a35] text-white"
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
