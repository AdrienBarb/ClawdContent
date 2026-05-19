"use client";

import { z } from "zod";
import type { UseFormReturn } from "react-hook-form";
import {
  ArrowRightIcon,
  SpinnerGapIcon,
  GlobeIcon,
  PencilSimpleIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorBanner } from "./ErrorBanner";

export const inputSchema = z
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

export type InputFormData = z.infer<typeof inputSchema>;

export function InputStep({
  form,
  isAnalyzing,
  error,
  onSubmit,
  onRetry,
}: {
  form: UseFormReturn<InputFormData>;
  isAnalyzing: boolean;
  error: string | null;
  onSubmit: (e: React.FormEvent) => void;
  onRetry: () => void;
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

      {error && <ErrorBanner message={error} onRetry={onRetry} />}

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
          className="bg-primary hover:bg-[#c84a35] text-white"
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
