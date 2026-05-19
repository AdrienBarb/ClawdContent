"use client";

import { useId, useRef, useState } from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  SpinnerGapIcon,
  ImageIcon,
  UploadSimpleIcon,
} from "@phosphor-icons/react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import {
  brandIdentitySchema,
  isHex6,
  type BrandIdentity,
} from "@/lib/schemas/brandIdentity";
import { useCloudinaryUpload } from "@/lib/hooks/useCloudinaryUpload";
import { ErrorBanner } from "./ErrorBanner";

const DEFAULT_BRAND: BrandIdentity = {
  // Neutral grays as default so a user who hits Continue without customizing
  // does NOT silently save PostClaw's coral as their own brand.
  logoUrl: null,
  primaryColor: "#111827",
  secondaryColor: "#6b7280",
  accentColor: null,
  brandPhotos: [],
  styleNotes: null,
};

type BrandSource = "extracted" | "manual" | "default";

export function BrandStep({
  extracted,
  isSaving,
  error,
  onBack,
  onSave,
  onRetry,
}: {
  extracted: BrandIdentity | null;
  isSaving: boolean;
  error: string | null;
  onBack: () => void;
  onSave: (brand: BrandIdentity) => void;
  onRetry: () => void;
}) {
  const initialDraft = extracted ?? DEFAULT_BRAND;
  const initialSource: BrandSource = extracted ? "extracted" : "default";

  const [draft, setDraft] = useState<BrandIdentity>(initialDraft);
  const [source, setSource] = useState<BrandSource>(initialSource);

  const showPreview = source === "extracted" && extracted !== null;

  const handleContinue = () => {
    const parsed = brandIdentitySchema.safeParse(draft);
    if (!parsed.success) {
      toast.error("Pick a primary and a secondary color before continuing.");
      return;
    }
    onSave(parsed.data);
  };

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

      {error && <ErrorBanner message={error} onRetry={onRetry} />}

      {showPreview && extracted ? (
        <BrandPreviewCard brand={extracted} />
      ) : (
        <BrandManualForm draft={draft} onChange={setDraft} />
      )}

      <div className="mt-8 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back
        </button>
        <div className="flex items-center gap-2">
          {showPreview && (
            <button
              type="button"
              onClick={() => setSource("manual")}
              className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
            >
              Customize
            </button>
          )}
          <Button
            type="button"
            className="bg-primary hover:bg-[#c84a35] text-white"
            disabled={isSaving}
            onClick={handleContinue}
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
    </div>
  );
}

function BrandPreviewCard({ brand }: { brand: BrandIdentity }) {
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
          {!brand.logoUrl && (
            <p className="text-[11px] text-gray-400 mt-1">
              We couldn&apos;t find a logo — click Customize to add one.
            </p>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
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
  const logoInputId = useId();
  const styleNotesId = useId();

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
        <label
          htmlFor={logoInputId}
          className="block text-sm font-medium text-gray-700 mb-2"
        >
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
              id={logoInputId}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => handleLogoSelect(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer disabled:opacity-50"
              disabled={uploading}
              aria-busy={uploading}
              aria-describedby={`${logoInputId}-status`}
            >
              {uploading ? (
                <SpinnerGapIcon className="h-4 w-4 animate-spin" />
              ) : (
                <UploadSimpleIcon className="h-4 w-4" />
              )}
              {draft.logoUrl ? "Replace logo" : "Upload logo"}
            </button>
            <p
              id={`${logoInputId}-status`}
              className="text-[11px] text-gray-400 mt-1"
              aria-live="polite"
            >
              {uploading ? "Uploading…" : "PNG or SVG, up to 25 MB. Optional."}
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
        <label
          htmlFor={styleNotesId}
          className="block text-sm font-medium text-gray-700 mb-1.5"
        >
          Style notes
        </label>
        <textarea
          id={styleNotesId}
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
          maxLength={500}
        />
        <p className="text-[11px] text-gray-400 mt-1">Optional.</p>
      </div>
    </div>
  );
}

const HEX_INPUT_PARTIAL = /^#[0-9a-fA-F]{0,6}$/;

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
  const textInputId = useId();
  const colorInputId = useId();
  const safeValue = value && HEX_INPUT_PARTIAL.test(value) ? value : "";
  const isComplete = isHex6(safeValue);
  const swatchColor = isComplete ? safeValue : "#e5e7eb";

  return (
    <div>
      <label
        htmlFor={textInputId}
        className="block text-sm font-medium text-gray-700 mb-1.5"
      >
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={colorInputId}
          type="color"
          value={isComplete ? safeValue : "#ec6f5b"}
          onChange={(e) => onChange(e.target.value.toLowerCase())}
          className="h-10 w-10 shrink-0 cursor-pointer rounded-lg border border-gray-200 bg-white"
          aria-label={`${label} color picker`}
        />
        <input
          id={textInputId}
          type="text"
          value={safeValue}
          onChange={(e) => {
            const next = e.target.value;
            if (next === "" && allowEmpty) {
              onChange("");
              return;
            }
            if (HEX_INPUT_PARTIAL.test(next) || next === "#") {
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
