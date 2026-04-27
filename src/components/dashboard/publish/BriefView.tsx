import { PencilLineIcon } from "@phosphor-icons/react";
import { ViewShell, ViewHeading, PrimaryButton } from "./ViewShell";

export function BriefView({
  brief,
  onBriefChange,
  canGoBack,
  error,
  onBack,
  onSubmit,
}: {
  brief: string;
  onBriefChange: (v: string) => void;
  canGoBack: boolean;
  error: string | null;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const trimmed = brief.trim();
  return (
    <ViewShell onBack={onBack} backLabel={canGoBack ? "Back" : "Cancel"}>
      <ViewHeading
        eyebrow="Create post"
        title="What do you want to share?"
        subtitle="Tell us about one event, a few ideas, or a whole week — we'll write the right number of posts."
        icon={<PencilLineIcon weight="duotone" />}
      />

      <div className="w-full max-w-xl">
        <label htmlFor="brief-textarea" className="sr-only">
          Describe what you want to post about
        </label>
        <textarea
          id="brief-textarea"
          value={brief}
          onChange={(e) => onBriefChange(e.target.value)}
          maxLength={1000}
          autoFocus
          rows={5}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "brief-error" : "brief-counter"}
          placeholder="e.g. We catered a wedding last weekend — or 'I want 3 posts about our spring menu' — or 'plan posts for our launch week'…"
          className="w-full text-base text-gray-900 leading-relaxed resize-none rounded-2xl border border-gray-200 p-5 focus:outline-none focus:border-[#e8614d] focus:ring-2 focus:ring-[#e8614d]/20 transition-all placeholder:text-gray-400 bg-white"
        />
        <div className="flex justify-end mt-1.5">
          <span
            id="brief-counter"
            className={`text-xs ${
              brief.length >= 1000
                ? "text-red-600"
                : brief.length >= 900
                  ? "text-amber-600"
                  : "text-gray-400"
            }`}
            aria-live="polite"
          >
            {brief.length}/1000
          </span>
        </div>

        {error && (
          <p id="brief-error" className="text-sm text-red-600 mt-4" role="alert">
            {error}
          </p>
        )}
        <div className="flex justify-end mt-8">
          <PrimaryButton
            onClick={onSubmit}
            disabled={trimmed.length === 0}
            size="lg"
          >
            Generate
          </PrimaryButton>
        </div>
      </div>
    </ViewShell>
  );
}
