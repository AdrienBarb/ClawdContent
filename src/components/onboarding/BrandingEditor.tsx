"use client";

import { useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  PlusIcon,
  XIcon,
  ImageIcon,
  SpinnerGapIcon,
  MagnifyingGlassIcon,
  CheckIcon,
} from "@phosphor-icons/react";
import { ColorPicker } from "@/components/ui/color-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FONT_FAMILIES } from "@/lib/constants/fonts";
import { appRouter } from "@/lib/constants/appRouter";
import type { Branding } from "@/lib/schemas/knowledgeBase";

const DEFAULT_SWATCH = "#6b7280";
const LOGO_ACCEPT = "image/png,image/jpeg,image/gif,image/webp";

const EYEBROW =
  "mb-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-gray-400";

interface BrandingEditorProps {
  value: Branding;
  onChange: (next: Branding) => void;
}

/**
 * Editable visual brand identity — logo, colour palette, fonts. Fully
 * editable from empty (the no-website case). Shared by the onboarding branding
 * step and the Business settings page. Verbal fields (tone, audience, style,
 * tagline) live in the parent forms.
 */
export default function BrandingEditor({ value, onChange }: BrandingEditorProps) {
  // Defensive: tolerate a legacy/unparsed value that isn't an array yet.
  const colors = Array.isArray(value.colors) ? value.colors : [];
  const fonts = Array.isArray(value.fonts) ? value.fonts : [];
  const logoUrl = value.logoUrl ?? null;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [fontSearch, setFontSearch] = useState("");

  const setColors = (next: string[]) =>
    onChange({ ...value, colors: next.length > 0 ? next : undefined });
  const setFonts = (next: string[]) =>
    onChange({ ...value, fonts: next.length > 0 ? next : undefined });
  const setLogo = (url: string | null) => onChange({ ...value, logoUrl: url });

  const handleLogoFile = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(appRouter.api.brandingLogo, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Upload failed");
      }
      const { url } = (await res.json()) as { url: string };
      setLogo(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't upload your logo");
    } finally {
      setUploading(false);
    }
  };

  const filteredFonts = FONT_FAMILIES.filter((f) =>
    f.toLowerCase().includes(fontSearch.trim().toLowerCase())
  );
  const toggleFont = (font: string) =>
    setFonts(
      fonts.includes(font) ? fonts.filter((f) => f !== font) : [...fonts, font]
    );

  return (
    <div className="space-y-6">
      {/* Logo */}
      <section>
        <p className={EYEBROW}>Logo</p>
        {logoUrl ? (
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center rounded-xl border border-gray-200 bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl}
                alt="Brand logo"
                className="h-10 max-w-[160px] object-contain"
              />
            </div>
            <div className="flex flex-col items-start gap-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-black/[0.03] cursor-pointer disabled:opacity-50"
              >
                {uploading ? (
                  <SpinnerGapIcon className="h-3.5 w-3.5 animate-spin" />
                ) : null}
                Replace
              </button>
              <button
                type="button"
                onClick={() => setLogo(null)}
                className="px-1 text-xs text-gray-400 transition-colors hover:text-[#c84a35] cursor-pointer"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 py-6 px-4 transition-colors hover:border-gray-300 hover:bg-gray-100/50 cursor-pointer disabled:opacity-60"
          >
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
              {uploading ? (
                <SpinnerGapIcon className="h-5 w-5 animate-spin text-gray-400" />
              ) : (
                <ImageIcon className="h-5 w-5 text-gray-400" />
              )}
            </div>
            <p className="text-sm text-gray-600">Upload your logo</p>
            <p className="mt-0.5 text-xs text-gray-400">
              PNG, JPG, GIF or WebP · max 4 MB
            </p>
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={LOGO_ACCEPT}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleLogoFile(f);
            e.target.value = "";
          }}
        />
      </section>

      {/* Colors */}
      <section>
        <p className={EYEBROW}>Colors</p>
        <div className="flex flex-wrap items-center gap-2">
          {colors.map((c, i) => (
            <div key={i} className="group relative">
              <ColorPicker
                value={c}
                ariaLabel={`Colour ${i + 1}`}
                onChange={(hex) => {
                  const next = [...colors];
                  next[i] = hex;
                  setColors(next);
                }}
              />
              <button
                type="button"
                onClick={() => setColors(colors.filter((_, idx) => idx !== i))}
                aria-label={`Remove colour ${i + 1}`}
                className="absolute -right-1.5 -top-1.5 hidden h-4 w-4 items-center justify-center rounded-full bg-gray-700 text-white shadow-sm group-hover:flex hover:bg-gray-900 cursor-pointer"
              >
                <XIcon className="h-2.5 w-2.5" weight="bold" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setColors([...colors, DEFAULT_SWATCH])}
            aria-label="Add colour"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-dashed border-gray-300 text-gray-400 transition-colors hover:border-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <PlusIcon className="h-4 w-4" />
          </button>
        </div>
        {colors.length === 0 && (
          <p className="mt-1.5 text-xs text-gray-400">
            Add the colors that define your brand.
          </p>
        )}
      </section>

      {/* Fonts */}
      <section>
        <p className={EYEBROW}>Fonts</p>
        <div className="flex flex-wrap items-center gap-2">
          {fonts.map((f) => (
            <span
              key={f}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-700"
            >
              <span>{f}</span>
              <button
                type="button"
                onClick={() => toggleFont(f)}
                aria-label={`Remove ${f}`}
                className="text-gray-400 transition-colors hover:text-[#c84a35] cursor-pointer"
              >
                <XIcon className="h-3 w-3" weight="bold" />
              </button>
            </span>
          ))}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full border border-dashed border-gray-300 px-3 py-1 text-xs text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <PlusIcon className="h-3 w-3" />
                Add font
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 rounded-xl p-0">
              <div className="border-b border-gray-100 p-2">
                <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-2 py-1.5">
                  <MagnifyingGlassIcon className="h-3.5 w-3.5 text-gray-400" />
                  <input
                    value={fontSearch}
                    onChange={(e) => setFontSearch(e.target.value)}
                    placeholder="Search fonts"
                    autoFocus
                    className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-300"
                  />
                </div>
              </div>
              <div className="max-h-56 overflow-y-auto p-1">
                {filteredFonts.map((font) => {
                  const selected = fonts.includes(font);
                  return (
                    <button
                      key={font}
                      type="button"
                      onClick={() => toggleFont(font)}
                      className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm text-gray-700 transition-colors hover:bg-black/[0.04] cursor-pointer"
                    >
                      <span>{font}</span>
                      {selected && (
                        <CheckIcon className="h-4 w-4 text-gray-700" weight="bold" />
                      )}
                    </button>
                  );
                })}
                {filteredFonts.length === 0 && (
                  <p className="px-2 py-3 text-center text-xs text-gray-400">
                    No fonts match
                  </p>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
        {fonts.length === 0 && (
          <p className="mt-1.5 text-xs text-gray-400">
            Pick the fonts your brand uses.
          </p>
        )}
      </section>
    </div>
  );
}
