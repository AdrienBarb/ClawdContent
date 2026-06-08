"use client";

import React from "react";
import { Input } from "@/components/ui/input";

/** Shared labelled input/textarea for the onboarding screens. */
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

export default FormField;
