"use client";

import { useState, type ReactNode } from "react";
import toast from "react-hot-toast";
import {
  SpinnerGapIcon,
  ArrowsClockwiseIcon,
  NotePencilIcon,
  CalendarIcon,
  PaperPlaneTiltIcon,
  SparkleIcon,
} from "@phosphor-icons/react";
import { appRouter } from "@/lib/constants/appRouter";
import { getPlatform } from "@/lib/constants/platforms";
import { InstagramPostPreview } from "@/components/dashboard/previews/InstagramPostPreview";
import { FacebookPostPreview } from "@/components/dashboard/previews/FacebookPostPreview";
import { SchedulePicker } from "@/components/dashboard/SchedulePicker";
import { jsonFetch } from "@/components/dashboard/week/datetime";
import type { ComposePostResponse } from "@/lib/schemas/composePost";
import type { MediaItem } from "@/lib/schemas/mediaItems";

interface Props {
  post: ComposePostResponse;
  onCommitted: (action: "published" | "scheduled") => void;
}

const CORAL_GRADIENT =
  "linear-gradient(180deg, #ec6f5b 0%, #c84a35 100%)";

export function GeneratedPostCard({ post, onCommitted }: Props) {
  const [caption, setCaption] = useState(post.content);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(post.mediaItems);
  const [mediaPlan, setMediaPlan] = useState<unknown>(post.mediaPlan);
  const [editing, setEditing] = useState(false);
  // "myself" = manual textarea, "ai" = describe-a-change rewrite box.
  const [captionMode, setCaptionMode] = useState<"myself" | "ai">("myself");
  const [regenOpen, setRegenOpen] = useState(false);
  // null = "Now" → the CTA posts immediately. Staging a time via the picker
  // flips the CTA to Schedule. ISO string, drops straight into the payload.
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  const [busy, setBusy] = useState<
    "media" | "caption" | "publish" | "schedule" | null
  >(null);

  const requiresMedia = post.requiresMedia;
  const hasMedia = mediaItems.length > 0;
  const commitBlocked = requiresMedia && !hasMedia;
  const contentType = hasMedia ? "image" : "text";
  const avatarColor = getPlatform(post.platform)?.color;

  const regenerate = async (instructionText: string) => {
    const instr = instructionText.trim();
    if (!instr) return;
    setBusy("media");
    try {
      const r = await jsonFetch(appRouter.api.exploreRegenerateImage, {
        method: "POST",
        body: JSON.stringify({
          accountId: post.accountId,
          content: caption,
          mediaPlan,
          instruction: instr,
        }),
      });
      if (!r.ok) {
        toast.error("Couldn't create a visual. Try again in a moment.");
        return;
      }
      const body = r.body as { mediaItems: MediaItem[]; mediaPlan: unknown };
      setMediaItems(body.mediaItems);
      setMediaPlan(body.mediaPlan);
      toast.success("New visual ready.");
      setRegenOpen(false);
    } catch {
      toast.error("Couldn't create a visual. Try again in a moment.");
    } finally {
      setBusy(null);
    }
  };

  const rewriteCaption = async (instructionText: string) => {
    const instr = instructionText.trim();
    if (!instr) return;
    setBusy("caption");
    try {
      const r = await jsonFetch(appRouter.api.postsRewrite, {
        method: "POST",
        body: JSON.stringify({
          content: caption,
          platform: post.platform,
          instruction: instr,
        }),
      });
      if (!r.ok) {
        toast.error("Couldn't rewrite the caption. Try again.");
        return;
      }
      const body = r.body as { content: string };
      setCaption(body.content);
      // Drop back to manual so the rewritten text lands in an editable box,
      // ready to fine-tune by hand (and the rewrite input resets).
      setCaptionMode("myself");
      toast.success("Caption updated.");
    } catch {
      toast.error("Couldn't rewrite the caption. Try again.");
    } finally {
      setBusy(null);
    }
  };

  const commit = async (action: "publish" | "schedule") => {
    if (action === "schedule" && !scheduledAt) {
      toast.error("Pick a time first.");
      return;
    }
    setBusy(action);
    try {
      const r = await jsonFetch(appRouter.api.exploreCommit, {
        method: "POST",
        body: JSON.stringify({
          accountId: post.accountId,
          content: caption,
          mediaItems,
          action,
          ...(action === "schedule" && scheduledAt ? { scheduledAt } : {}),
        }),
      });
      if (!r.ok) {
        const body = r.body as { message?: string } | null;
        toast.error(body?.message ?? "Couldn't commit this post.");
        return;
      }
      onCommitted(action === "schedule" ? "scheduled" : "published");
    } catch {
      toast.error("Couldn't commit this post. Try again.");
    } finally {
      setBusy(null);
    }
  };

  const Preview =
    post.platform === "facebook" ? FacebookPostPreview : InstagramPostPreview;

  return (
    <div className="mx-auto w-full max-w-[460px] overflow-hidden rounded-2xl border border-gray-200 bg-[#faf9f5] shadow-sm">
      {/* The post itself */}
      <div className="relative p-3">
        <Preview
          username={post.username}
          caption={caption}
          mediaItems={mediaItems}
          contentType={contentType}
          avatarColor={avatarColor}
          embedded
          expandable
        />
        {busy === "media" ? (
          <div className="absolute inset-3 flex items-center justify-center rounded-xl bg-white/70">
            <SpinnerGapIcon className="h-6 w-6 animate-spin text-gray-500" />
          </div>
        ) : null}
      </div>

      {/* Instagram needs a visual before it can be committed */}
      {commitBlocked ? (
        <div className="px-3 pb-3">
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-[12px] leading-relaxed text-amber-800">
            Instagram needs a visual to publish — add one with “Add a visual”.
          </p>
        </div>
      ) : null}

      {/* Tweak tools — two ghost buttons; each opens its panel below. Only one
          panel is open at a time so the card stays compact. */}
      <div className="flex flex-wrap items-center gap-1 border-t border-gray-200 px-2 py-1.5">
        <TweakTabButton
          icon={<NotePencilIcon className="h-4 w-4" />}
          label="Edit caption"
          active={editing}
          disabled={busy !== null}
          onClick={() => {
            setEditing((v) => !v);
            setRegenOpen(false);
          }}
        />
        <TweakTabButton
          icon={<ArrowsClockwiseIcon className="h-4 w-4" />}
          label={hasMedia ? "Edit visual" : "Add a visual"}
          active={regenOpen}
          disabled={busy !== null}
          onClick={() => {
            setRegenOpen((v) => !v);
            setEditing(false);
          }}
        />
      </div>

      {/* Caption panel — manual textarea OR a describe-a-change rewrite box,
          chosen by the toggle. */}
      {editing ? (
        <div className="space-y-2.5 border-t border-gray-200 px-3 py-3">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 text-[12px] font-medium">
            <button
              type="button"
              onClick={() => setCaptionMode("myself")}
              disabled={busy !== null}
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
              disabled={busy !== null}
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
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={5}
              maxLength={10000}
              autoFocus
              className="w-full resize-y rounded-lg border border-gray-200 bg-white p-3 text-[13px] leading-relaxed text-gray-900 outline-none focus:border-gray-400"
            />
          ) : (
            <TweakInstruction
              placeholder="Tell us how to change it — e.g. shorter, more formal"
              runLabel="Rewrite"
              busy={busy === "caption"}
              onRun={rewriteCaption}
            />
          )}
        </div>
      ) : null}

      {/* Visual panel — same describe-a-change box as the caption rewrite. An
          instruction is required (no blind regenerate). */}
      {regenOpen ? (
        <div className="space-y-2 border-t border-gray-200 px-3 py-3">
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
            busy={busy === "media"}
            onRun={regenerate}
          />
        </div>
      ) : null}

      {/* Commit bar — split-button: a "Now"/time selector flush against the
          publish CTA. Same pattern as the results-board BulkBar. Default is
          "Now" → Post now; staging a time in the picker flips it to Schedule. */}
      <div className="flex items-center justify-end border-t border-gray-200 bg-white px-3 py-2.5">
        <span className="inline-flex items-stretch">
          <SchedulePicker
            disabled={busy !== null || commitBlocked}
            platform={post.platform}
            variant="verbose"
            scheduledAt={scheduledAt}
            joinRight
            onSchedule={(date) => setScheduledAt(date.toISOString())}
            onCancelSchedule={() => setScheduledAt(null)}
          />
          <button
            type="button"
            onClick={() => commit(scheduledAt ? "schedule" : "publish")}
            disabled={busy !== null || commitBlocked}
            className="inline-flex h-10 md:h-8 items-center gap-1.5 rounded-r-lg px-3 text-[12.5px] font-medium text-white transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              background: CORAL_GRADIENT,
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 2px rgba(200,74,53,0.25)",
            }}
          >
            {busy === "publish" || busy === "schedule" ? (
              <SpinnerGapIcon className="h-3.5 w-3.5 animate-spin" />
            ) : scheduledAt ? (
              <CalendarIcon className="h-3.5 w-3.5" weight="fill" />
            ) : (
              <PaperPlaneTiltIcon className="h-3.5 w-3.5" />
            )}
            <span>
              {busy === "publish"
                ? "Posting…"
                : busy === "schedule"
                  ? "Scheduling…"
                  : scheduledAt
                    ? "Schedule post"
                    : "Post now"}
            </span>
          </button>
        </span>
      </div>
    </div>
  );
}

/** Ghost toggle button in the tweak-tools row. Active = soft wash. */
function TweakTabButton({
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
function TweakInstruction({
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
