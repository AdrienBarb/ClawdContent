"use client";

import { useRef, useState, type ReactNode } from "react";
import {
  SparkleIcon,
  SpinnerGapIcon,
  UploadSimpleIcon,
} from "@phosphor-icons/react";

/**
 * Shared post-card edit controls. Both the Explore generator
 * (`explore/GeneratedPostCard`) and the week timeline (`week/PostCard`) use
 * these so the caption / visual editing UX is identical across the app — a
 * user who edits a post in one place finds the same controls in the other.
 */

/** Ghost toggle button in the tweak-tools row. Active = soft wash. */
export function TweakTabButton({
  icon,
  label,
  active,
  disabled,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-expanded={active}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors disabled:opacity-50 ${
        active
          ? "bg-black/[0.05] text-gray-900"
          : "text-gray-600 hover:bg-black/[0.04] hover:text-gray-900"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

/**
 * Shared "describe a change" control: a free-text instruction + a run button.
 * Reused by the caption rewrite and the visual regenerate so both behave
 * identically. An instruction is required — the button stays disabled until the
 * field is non-empty. Manages its own input so it resets when the panel closes.
 */
export function TweakInstruction({
  placeholder,
  runLabel,
  busy,
  onRun,
}: {
  placeholder: string;
  runLabel: string;
  busy: boolean;
  onRun: (instruction: string) => void;
}) {
  const [value, setValue] = useState("");
  const trimmed = value.trim();
  const canRun = !busy && trimmed.length > 0;

  return (
    <div className="flex items-center gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (canRun) onRun(trimmed);
          }
        }}
        autoFocus
        maxLength={500}
        disabled={busy}
        placeholder={placeholder}
        className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-400 disabled:opacity-50"
      />
      <button
        type="button"
        onClick={() => {
          if (canRun) onRun(trimmed);
        }}
        disabled={!canRun}
        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-gray-900 px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? (
          <SpinnerGapIcon className="h-4 w-4 animate-spin" />
        ) : (
          <SparkleIcon className="h-4 w-4" weight="fill" />
        )}
        {runLabel}
      </button>
    </div>
  );
}

/**
 * Caption editor panel: an "Edit myself / Rewrite for me" segmented toggle over
 * a manual textarea or a rewrite instruction box. Owns only the toggle state —
 * the caption value and what "save" means live in the parent (the Explore card
 * defers persistence to commit; the week card persists via `footer`'s Save).
 *
 * `onRewrite` resolves `true` when a rewrite was applied (the parent has
 * dropped the new text into `value`); the panel then flips back to manual so
 * the user can review/fine-tune it. On failure (`false`) it stays on rewrite.
 */
export function CaptionEditor({
  value,
  onChange,
  disabled,
  rewriting,
  onRewrite,
  footer,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  rewriting: boolean;
  onRewrite: (instruction: string) => Promise<boolean | void> | boolean | void;
  footer?: ReactNode;
}) {
  const [captionMode, setCaptionMode] = useState<"myself" | "ai">("myself");

  return (
    <div className="space-y-2.5 border-t border-gray-200 px-4 py-3">
      <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 text-[12px] font-medium">
        <button
          type="button"
          onClick={() => setCaptionMode("myself")}
          disabled={disabled}
          className={`rounded-[6px] px-2.5 py-1 transition-colors disabled:opacity-50 ${
            captionMode === "myself"
              ? "bg-gray-900 text-white"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Edit myself
        </button>
        <button
          type="button"
          onClick={() => setCaptionMode("ai")}
          disabled={disabled}
          className={`inline-flex items-center gap-1 rounded-[6px] px-2.5 py-1 transition-colors disabled:opacity-50 ${
            captionMode === "ai"
              ? "bg-gray-900 text-white"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <SparkleIcon className="h-3.5 w-3.5" weight="fill" />
          Rewrite for me
        </button>
      </div>

      {captionMode === "myself" ? (
        <>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={5}
            maxLength={10000}
            autoFocus
            className="w-full resize-y rounded-lg border border-gray-200 bg-white p-3 text-[13px] leading-relaxed text-gray-900 outline-none focus:border-gray-400"
          />
          {footer}
        </>
      ) : (
        <TweakInstruction
          placeholder="Tell us how to change it — e.g. shorter, more formal"
          runLabel="Rewrite"
          busy={rewriting}
          onRun={async (instr) => {
            const applied = await onRewrite(instr);
            if (applied !== false) setCaptionMode("myself");
          }}
        />
      )}
    </div>
  );
}

/**
 * Visual editor panel: a describe-a-change box (regenerate) plus an "upload your
 * own" path. Owns the hidden file input. The parent decides what regenerate /
 * upload do (and whether to persist). `accept` defaults to images; the week
 * card widens it to video for reel slots.
 */
export function VisualEditor({
  hasMedia,
  regenerating,
  onRegenerate,
  onUpload,
  accept = "image/*",
  disabled,
}: {
  hasMedia: boolean;
  regenerating: boolean;
  onRegenerate: (instruction: string) => void;
  onUpload: (file: File) => void;
  accept?: string;
  disabled: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2 border-t border-gray-200 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">
        {hasMedia ? "What should we change?" : "Describe the visual"}
      </p>
      <TweakInstruction
        placeholder={
          hasMedia
            ? "e.g. warmer, show a latte, less text"
            : "e.g. a flat lay of coffee beans on linen"
        }
        runLabel={hasMedia ? "Regenerate" : "Generate"}
        busy={regenerating}
        onRun={onRegenerate}
      />

      {/* …or skip the generator and bring your own picture. */}
      <div className="flex items-center gap-2 pt-0.5">
        <span className="h-px flex-1 bg-gray-200" />
        <span className="text-[11px] text-gray-400">or</span>
        <span className="h-px flex-1 bg-gray-200" />
      </div>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] font-medium text-gray-700 transition-colors hover:bg-black/[0.02] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <UploadSimpleIcon className="h-4 w-4" />
        Upload your own picture
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(f);
          // Reset so picking the same file twice still fires onChange.
          e.target.value = "";
        }}
      />
    </div>
  );
}
