"use client";

import { useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  ArrowsLeftRightIcon,
  CheckIcon,
  ClockIcon,
  ImageIcon,
  NotePencilIcon,
  SparkleIcon,
  SpinnerGapIcon,
  UploadSimpleIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { appRouter } from "@/lib/constants/appRouter";
import { getPlatform } from "@/lib/constants/platforms";
import { useSupabaseUpload } from "@/lib/hooks/useSupabaseUpload";
import { InstagramPostPreview } from "@/components/dashboard/previews/InstagramPostPreview";
import { FacebookPostPreview } from "@/components/dashboard/previews/FacebookPostPreview";
import { jsonFetch, localInputToIso, toLocalInputValue } from "./datetime";
import type { TimelineItem } from "./types";

type AutopilotMode = "full_auto" | "review";
type Editor = null | "caption" | "time" | "image" | "rewrite";

interface Props {
  item: TimelineItem;
  timezone: string | null;
  mode: AutopilotMode;
  /** Pre-formatted local time, e.g. "6:30 PM". */
  timeLabel: string;
  onChanged: () => void;
}

export function PostCard({
  item,
  timezone,
  mode,
  timeLabel,
  onChanged,
}: Props) {
  const [editor, setEditor] = useState<Editor>(null);
  const [content, setContent] = useState(item.content);
  const [timeValue, setTimeValue] = useState(
    toLocalInputValue(item.scheduledAt, timezone)
  );
  const [rewriteInstruction, setRewriteInstruction] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { upload, uploading } = useSupabaseUpload();

  const isLocal = item.kind === "local";
  const isText = item.contentType === "text";
  const meta = getPlatform(item.platform);
  const Preview = item.platform === "facebook" ? FacebookPostPreview : InstagramPostPreview;

  const reviewPending = mode === "review" && isLocal && item.status === "draft";
  const status = statusInfo(item, reviewPending);

  // Media regen + caption rewrite operate on the local PostSuggestion; once a
  // post is committed to Zernio there's no draft left to regenerate from.
  const showSwap = isLocal && !isText;
  const showRewrite = isLocal;

  const run = async (label: string, fn: () => Promise<boolean>) => {
    setBusy(label);
    try {
      const ok = await fn();
      if (ok) onChanged();
      return ok;
    } finally {
      setBusy(null);
    }
  };

  const openEditor = (which: Exclude<Editor, null>) => {
    if (which === "caption") setContent(item.content);
    if (which === "time") setTimeValue(toLocalInputValue(item.scheduledAt, timezone));
    if (which === "rewrite") setRewriteInstruction("");
    setEditor(which);
  };
  const closeEditor = () => setEditor(null);

  const saveCaption = () =>
    run("caption", async () => {
      if (content.trim() === item.content.trim()) {
        closeEditor();
        return false;
      }
      const r = isLocal
        ? await jsonFetch(`${appRouter.api.suggestions}/${item.id}`, {
            method: "PATCH",
            body: JSON.stringify({ content }),
          })
        : await jsonFetch(appRouter.api.postsUpdate, {
            method: "POST",
            body: JSON.stringify({ postId: item.id, content }),
          });
      if (!r.ok) {
        toast.error("Couldn't save the caption.");
        return false;
      }
      toast.success("Caption updated.");
      closeEditor();
      return true;
    });

  const saveTime = () =>
    run("time", async () => {
      const iso = localInputToIso(timeValue, timezone);
      if (!iso) {
        toast.error("Pick a date and time first.");
        return false;
      }
      const r = isLocal
        ? await jsonFetch(`${appRouter.api.suggestions}/${item.id}`, {
            method: "PATCH",
            body: JSON.stringify({ scheduledAt: iso }),
          })
        : await jsonFetch(appRouter.api.postsUpdate, {
            method: "POST",
            body: JSON.stringify({ postId: item.id, scheduledAt: iso }),
          });
      if (!r.ok) {
        const body = r.body as { message?: string } | null;
        toast.error(body?.message ?? "Couldn't reschedule the post.");
        return false;
      }
      toast.success("Rescheduled.");
      closeEditor();
      return true;
    });

  // Plain schedule call (no `run` wrapper) so it can be composed inside another
  // busy-guarded action. Surfaces its own error toast; returns success.
  const commitSchedule = async (): Promise<boolean> => {
    const r = await jsonFetch(`${appRouter.api.suggestions}/${item.id}`, {
      method: "POST",
      body: JSON.stringify({ action: "schedule" }),
    });
    if (!r.ok) {
      const body = r.body as { message?: string } | null;
      toast.error(body?.message ?? "Couldn't schedule this post.");
      return false;
    }
    return true;
  };

  // full_auto holds a post back ONLY for a missing visual — once it has one it
  // should rejoin the schedule on its own, never linger as a draft. In review
  // the freed post stays a draft awaiting the user's approval.
  const autoSchedulesOnVisual = mode === "full_auto" && item.status === "needs_media";

  const regenerateVisual = () =>
    run("regen-visual", async () => {
      const r = await jsonFetch(appRouter.api.autopilotRegenerateMedia, {
        method: "POST",
        body: JSON.stringify({ suggestionId: item.id }),
      });
      if (!r.ok) {
        toast.error("Couldn't generate a new visual. Try again in a moment.");
        return false;
      }
      if (autoSchedulesOnVisual) {
        if (await commitSchedule()) toast.success("New visual ready — scheduled.");
      } else {
        toast.success("New visual ready.");
      }
      closeEditor();
      return true;
    });

  const uploadVisual = (file: File) =>
    run("upload", async () => {
      try {
        const items = await upload([file]);
        if (items.length === 0) return false;
        const r = await jsonFetch(`${appRouter.api.suggestions}/${item.id}`, {
          method: "PATCH",
          body: JSON.stringify({ mediaItems: items }),
        });
        if (!r.ok) {
          const body = r.body as { message?: string } | null;
          toast.error(body?.message ?? "Couldn't attach that file.");
          return false;
        }
        if (autoSchedulesOnVisual) {
          if (await commitSchedule()) toast.success("Image added — scheduled.");
        } else {
          toast.success("Image swapped.");
        }
        closeEditor();
        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't upload that file.");
        return false;
      }
    });

  const rewriteCaption = () =>
    run("rewrite", async () => {
      const instruction = rewriteInstruction.trim() || "rewrite";
      const r = await jsonFetch(`${appRouter.api.suggestions}/${item.id}/rewrite`, {
        method: "POST",
        body: JSON.stringify({ instruction }),
      });
      if (!r.ok) {
        toast.error("Couldn't rewrite the caption. Try again in a moment.");
        return false;
      }
      toast.success("Caption rewritten.");
      closeEditor();
      return true;
    });

  const schedule = () =>
    run("schedule", async () => {
      const ok = await commitSchedule();
      if (ok) toast.success("Scheduled.");
      return ok;
    });

  const remove = () =>
    run("remove", async () => {
      const r = isLocal
        ? await jsonFetch(`${appRouter.api.suggestions}/${item.id}`, {
            method: "DELETE",
          })
        : await jsonFetch(appRouter.api.postsActions, {
            method: "POST",
            body: JSON.stringify({ postId: item.id, action: "delete" }),
          });
      if (!r.ok) {
        toast.error("Couldn't remove this post.");
        return false;
      }
      toast.success("Removed — it won't be published.");
      return true;
    });

  const busyAny = busy !== null || uploading;

  return (
    <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* Native post preview */}
      <div className="px-4 pt-4 pb-3">
        <Preview
          username={item.username}
          caption={item.content}
          mediaItems={item.mediaItems}
          contentType={item.contentType}
          avatarColor={meta?.color}
          embedded
          expandable
        />
      </div>

      {/* Meta row: time + status + adjust toggle */}
      <div className="flex items-center justify-between gap-3 px-4 pb-3">
        <div className="flex min-w-0 items-center gap-1.5 text-gray-500">
          <ClockIcon className="h-4 w-4 shrink-0 text-gray-400" />
          <span className="truncate text-[13px] font-medium tabular-nums text-gray-700">
            {timeLabel}
          </span>
        </div>
        <StatusBadge info={status} />
      </div>

      {/* Action panel — always visible */}
      <div className="border-t border-gray-100 px-4 py-4">
        {editor === "caption" ? (
            <EditorShell title="Edit caption">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                autoFocus
                className="w-full resize-y rounded-lg border border-gray-200 bg-white p-3 text-[13px] leading-relaxed outline-none focus:border-gray-400"
              />
              <EditorButtons
                onCancel={closeEditor}
                onSave={saveCaption}
                saving={busy === "caption"}
                disabled={busyAny}
              />
            </EditorShell>
          ) : editor === "time" ? (
            <EditorShell title="Reschedule">
              <input
                type="datetime-local"
                value={timeValue}
                onChange={(e) => setTimeValue(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[13px] outline-none focus:border-gray-400"
              />
              <EditorButtons
                onCancel={closeEditor}
                onSave={saveTime}
                saving={busy === "time"}
                disabled={busyAny || !timeValue}
              />
            </EditorShell>
          ) : editor === "image" ? (
            <EditorShell title="Swap image">
              <div className="grid grid-cols-2 gap-2">
                <ActionButton
                  icon={<SparkleIcon className="h-4 w-4 text-gray-400" />}
                  label="Generate new"
                  onClick={regenerateVisual}
                  loading={busy === "regen-visual"}
                  disabled={busyAny}
                />
                <ActionButton
                  icon={<UploadSimpleIcon className="h-4 w-4 text-gray-400" />}
                  label="Upload my own"
                  onClick={() => fileInputRef.current?.click()}
                  loading={busy === "upload" || uploading}
                  disabled={busyAny}
                />
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadVisual(f);
                  e.target.value = "";
                }}
              />
              <div className="flex justify-end pt-1">
                <button
                  onClick={closeEditor}
                  disabled={busyAny}
                  className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-gray-500 hover:bg-black/[0.04] hover:text-gray-900 disabled:opacity-50"
                >
                  Done
                </button>
              </div>
            </EditorShell>
          ) : editor === "rewrite" ? (
            <EditorShell title="Rewrite caption">
              <textarea
                value={rewriteInstruction}
                onChange={(e) => setRewriteInstruction(e.target.value)}
                rows={3}
                autoFocus
                placeholder="Optional — e.g. make it shorter, more playful, add a call to action"
                className="w-full resize-y rounded-lg border border-gray-200 bg-white p-3 text-[13px] leading-relaxed outline-none placeholder:text-gray-400 focus:border-gray-400"
              />
              <EditorButtons
                onCancel={closeEditor}
                onSave={rewriteCaption}
                saving={busy === "rewrite"}
                disabled={busyAny}
                saveLabel="Rewrite"
              />
            </EditorShell>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-gray-400">
                Adjust this post
              </p>
              <div className="grid grid-cols-2 gap-2">
                <ActionButton
                  icon={<NotePencilIcon className="h-4 w-4 text-gray-400" />}
                  label="Edit caption"
                  onClick={() => openEditor("caption")}
                  disabled={busyAny}
                />
                <ActionButton
                  icon={<ClockIcon className="h-4 w-4 text-gray-400" />}
                  label="Reschedule"
                  onClick={() => openEditor("time")}
                  disabled={busyAny}
                />
                {showSwap ? (
                  <ActionButton
                    icon={<ArrowsLeftRightIcon className="h-4 w-4 text-gray-400" />}
                    label="Swap image"
                    onClick={() => openEditor("image")}
                    disabled={busyAny}
                  />
                ) : null}
                {showRewrite ? (
                  <ActionButton
                    icon={<SparkleIcon className="h-4 w-4 text-gray-400" />}
                    label="Rewrite caption"
                    onClick={() => openEditor("rewrite")}
                    disabled={busyAny}
                  />
                ) : null}
              </div>

              <PrimaryRow
                item={item}
                mode={mode}
                busy={busy}
                disabled={busyAny}
                onSchedule={schedule}
                onReschedule={() => openEditor("time")}
                onAddMedia={() => openEditor("image")}
                onRemove={remove}
              />
            </div>
          )}
      </div>
    </article>
  );
}

// ─── Primary action row (contextual) ─────────────────────────────────

function PrimaryRow({
  item,
  mode,
  busy,
  disabled,
  onSchedule,
  onReschedule,
  onAddMedia,
  onRemove,
}: {
  item: TimelineItem;
  mode: AutopilotMode;
  busy: string | null;
  disabled: boolean;
  onSchedule: () => void;
  onReschedule: () => void;
  onAddMedia: () => void;
  onRemove: () => void;
}) {
  // Held back from commit until it has a visual — adding one is the only path forward.
  if (item.status === "needs_media") {
    return (
      <div className="flex items-center gap-2 pt-1">
        <PrimaryButton onClick={onAddMedia} disabled={disabled} className="flex-1">
          <ImageIcon className="h-4 w-4" weight="fill" />
          Add a visual
        </PrimaryButton>
        <RemoveButton onClick={onRemove} loading={busy === "remove"} disabled={disabled} />
      </div>
    );
  }

  // A staged local draft. In "Approve first" the card IS the approval gate. In
  // "Publish automatically" a draft only lands here if an auto-schedule failed —
  // never a bare "Schedule" CTA that would contradict the auto-publish promise.
  if (item.kind === "local" && item.status === "draft") {
    const isReview = mode === "review";
    // The usual full_auto failure is a planned slot that has already passed, where
    // retrying the same time just re-fails. Decide retry-vs-reschedule at click
    // time (reading the clock during render is impure) so a passed slot routes to
    // the time editor instead of dead-ending on the same time.
    const onPrimary = isReview
      ? onSchedule
      : () => {
          const slotPassed =
            !item.scheduledAt ||
            new Date(item.scheduledAt).getTime() <= Date.now();
          if (slotPassed) onReschedule();
          else onSchedule();
        };
    return (
      <div className="flex flex-col gap-2 pt-1">
        {/* In full_auto a draft only sits here because its auto-schedule failed.
            Name that failure — otherwise the recovery CTA reads as a mystery. */}
        {!isReview && (
          <p className="flex items-center gap-1.5 text-[12px] text-gray-500">
            <WarningCircleIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" weight="fill" />
            This one didn’t go out automatically.
          </p>
        )}
        <div className="flex items-center gap-2">
          <PrimaryButton onClick={onPrimary} disabled={disabled} className="flex-1">
            {busy === "schedule" ? (
              <SpinnerGapIcon className="h-4 w-4 animate-spin" />
            ) : isReview ? (
              <>
                <CheckIcon className="h-4 w-4" weight="bold" />
                Approve &amp; schedule
              </>
            ) : (
              "Schedule it"
            )}
          </PrimaryButton>
          <RemoveButton onClick={onRemove} loading={busy === "remove"} disabled={disabled} />
        </div>
      </div>
    );
  }

  // Already on the schedule — quiet confirmation + a way to pull it.
  return (
    <div className="flex items-center justify-between gap-2 pt-1">
      <span className="text-[12px] text-gray-400">
        Scheduled — it’ll post automatically.
      </span>
      <button
        onClick={onRemove}
        disabled={disabled}
        className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-gray-500 hover:bg-[#fef2f0] hover:text-[#c84a35] disabled:opacity-50"
      >
        {busy === "remove" ? (
          <SpinnerGapIcon className="inline h-4 w-4 animate-spin" />
        ) : (
          "Remove"
        )}
      </button>
    </div>
  );
}

// ─── Small building blocks ───────────────────────────────────────────

function ActionButton({
  icon,
  label,
  onClick,
  disabled,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[13px] font-medium text-gray-700 transition-colors hover:bg-black/[0.02] disabled:opacity-50"
    >
      {loading ? (
        <SpinnerGapIcon className="h-4 w-4 animate-spin text-gray-400" />
      ) : (
        <span className="flex h-4 w-4 shrink-0 items-center justify-center">
          {icon}
        </span>
      )}
      {label}
    </button>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-[13px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_1px_2px_rgba(200,74,53,0.25)] transition-opacity disabled:opacity-50 ${className ?? ""}`}
      style={{ background: "linear-gradient(180deg, #ec6f5b 0%, #c84a35 100%)" }}
    >
      {children}
    </button>
  );
}

function RemoveButton({
  onClick,
  loading,
  disabled,
}: {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-medium text-gray-600 transition-colors hover:bg-[#fef2f0] hover:text-[#c84a35] hover:border-[#f4cabf] disabled:opacity-50"
    >
      {loading ? <SpinnerGapIcon className="h-4 w-4 animate-spin" /> : "Remove"}
    </button>
  );
}

function EditorShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-gray-400">
        {title}
      </p>
      {children}
    </div>
  );
}

function EditorButtons({
  onCancel,
  onSave,
  saving,
  disabled,
  saveLabel = "Save",
}: {
  onCancel: () => void;
  onSave: () => void;
  saving?: boolean;
  disabled?: boolean;
  saveLabel?: string;
}) {
  return (
    <div className="flex justify-end gap-2">
      <button
        onClick={onCancel}
        disabled={disabled}
        className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-gray-500 hover:bg-black/[0.04] hover:text-gray-900 disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        onClick={onSave}
        disabled={disabled}
        className="rounded-lg bg-[#2d2a25] px-4 py-1.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {saving ? <SpinnerGapIcon className="inline h-4 w-4 animate-spin" /> : saveLabel}
      </button>
    </div>
  );
}

// ─── Status badge ────────────────────────────────────────────────────

interface StatusVisual {
  label: string;
  text: string;
  bg: string;
  dot: string;
}

function statusInfo(
  item: TimelineItem,
  reviewPending: boolean
): StatusVisual {
  if (item.status === "needs_media") {
    return {
      label: "Needs a visual",
      text: "text-amber-800",
      bg: "bg-amber-50",
      dot: "#d97706",
    };
  }
  if (item.status === "scheduled") {
    return {
      label: "Scheduled",
      text: "text-emerald-700",
      bg: "bg-emerald-50",
      dot: "#22a565",
    };
  }
  if (reviewPending) {
    return {
      label: "Needs review",
      text: "text-[#b23b27]",
      bg: "bg-[#fef2f0]",
      dot: "#ec6f5b",
    };
  }
  return {
    label: "Draft",
    text: "text-gray-600",
    bg: "bg-gray-100",
    dot: "#9ca3af",
  };
}

function StatusBadge({ info }: { info: StatusVisual }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium ${info.bg} ${info.text}`}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: info.dot }}
      />
      {info.label}
    </span>
  );
}
