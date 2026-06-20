"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import {
  ArrowsClockwiseIcon,
  CheckIcon,
  ClockIcon,
  NotePencilIcon,
  SpinnerGapIcon,
} from "@phosphor-icons/react";
import { appRouter } from "@/lib/constants/appRouter";
import { getPlatform } from "@/lib/constants/platforms";
import { useSupabaseUpload } from "@/lib/hooks/useSupabaseUpload";
import { InstagramPostPreview } from "@/components/dashboard/previews/InstagramPostPreview";
import {
  TweakTabButton,
  CaptionEditor,
  VisualEditor,
} from "@/components/dashboard/common/TweakControls";
import { jsonFetch } from "./datetime";
import { showApproveAction, type AutopilotMode } from "./cardActions";
import type { TimelineItem } from "./types";
import type { MediaItem } from "@/lib/schemas/mediaItems";

interface Props {
  item: TimelineItem;
  mode: AutopilotMode;
  /** Pre-formatted local time, e.g. "6:30 PM". */
  timeLabel: string;
  onChanged: () => void;
}

export function PostCard({ item, mode, timeLabel, onChanged }: Props) {
  // Which inline panel is open. Mirrors the Explore card: two ghost toggles,
  // only one panel open at a time so the card stays compact.
  const [editing, setEditing] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);
  // Seeded once; deliberately NOT reset when the caption panel re-opens, so an
  // unsaved edit / AI rewrite survives a tab toggle (mirrors the Explore card).
  const [content, setContent] = useState(item.content);
  const [busy, setBusy] = useState<string | null>(null);
  const { upload, uploading } = useSupabaseUpload();

  const isLocal = item.kind === "local";
  // A committed post already lives on the Zernio schedule. It can't be
  // "approved" (it's done) — only edited or removed.
  const isCommitted = item.kind === "zernio";
  const accountId = item.accountId;
  const hasMedia = item.mediaItems.length > 0;
  const needsMedia = item.status === "needs_media";
  const isPublished = item.status === "published";
  const meta = getPlatform(item.platform);

  // Derive the preview's content type from the live media — the stored
  // contentType can lag a regenerate/upload (PATCH doesn't recompute it).
  // Mirrors the Explore card.
  const displayContentType = item.mediaItems.some((m) => m.type === "video")
    ? "video"
    : item.mediaItems.length > 1
      ? "carousel"
      : item.mediaItems.length === 1
        ? "image"
        : "text";

  const reviewPending = mode === "review" && isLocal && item.status === "draft";
  const status = statusInfo(item, reviewPending);

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

  const openCaption = () => {
    setRegenOpen(false);
    setEditing(true);
  };
  const openVisual = () => {
    setEditing(false);
    setRegenOpen(true);
  };
  const closeCaption = () => setEditing(false);
  const closeVisual = () => setRegenOpen(false);

  // ── Caption ──────────────────────────────────────────────────────────
  // Manual edit: persist to whichever store backs this card. The Explore card
  // defers persistence to commit, but a week post already exists — so we save.
  const saveCaption = () =>
    run("caption", async () => {
      if (content.trim() === item.content.trim()) {
        closeCaption();
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
      closeCaption();
      return true;
    });

  // AI rewrite: stateless (same endpoint as Explore) — drops the result into
  // the manual box for the user to review and Save. Not wrapped in `run` (it
  // must NOT refetch — nothing is persisted until Save). Resolves true so
  // CaptionEditor flips back to the manual box with the new text.
  const rewriteCaption = async (instr: string): Promise<boolean> => {
    setBusy("caption-ai");
    try {
      const r = await jsonFetch(appRouter.api.postsRewrite, {
        method: "POST",
        body: JSON.stringify({
          content,
          platform: item.platform,
          instruction: instr,
        }),
      });
      if (!r.ok) {
        toast.error("Couldn't rewrite the caption. Try again.");
        return false;
      }
      const body = r.body as { content: string };
      setContent(body.content);
      toast.success("Caption rewritten — review it and save.");
      return true;
    } finally {
      setBusy(null);
    }
  };

  // ── Visual ───────────────────────────────────────────────────────────
  // full_auto holds a post back ONLY for a missing visual — once it has one it
  // should rejoin the schedule on its own, never linger as a draft. In review
  // the freed post stays a draft awaiting the user's approval.
  const autoSchedulesOnVisual = mode === "full_auto" && needsMedia;

  // Replace the visual on whichever store backs this card: a local draft
  // patches its PostSuggestion (which also clears a needs_media hold); a
  // committed post updates the Zernio post in place.
  const persistMedia = async (mediaItems: MediaItem[]): Promise<boolean> => {
    const r = isLocal
      ? await jsonFetch(`${appRouter.api.suggestions}/${item.id}`, {
          method: "PATCH",
          body: JSON.stringify({ mediaItems }),
        })
      : await jsonFetch(appRouter.api.postsUpdate, {
          method: "POST",
          body: JSON.stringify({ postId: item.id, mediaItems }),
        });
    if (!r.ok) {
      const body = r.body as { message?: string } | null;
      toast.error(body?.message ?? "Couldn't save the new visual.");
      return false;
    }
    return true;
  };

  const regenerateVisual = (instruction: string) =>
    run("regen-visual", async () => {
      if (!accountId) {
        toast.error("Couldn't find this account. Reconnect it and try again.");
        return false;
      }
      const instr = instruction.trim();
      if (!instr) return false;
      // Stateless render (same engine as /explore): returns fresh media we then
      // persist onto whichever store backs this card.
      const gen = await jsonFetch(appRouter.api.exploreRegenerateImage, {
        method: "POST",
        body: JSON.stringify({
          accountId,
          // Use the live (possibly edited) caption, like the Explore card —
          // the visual should match what the user is actually writing.
          content,
          ...(item.mediaPlan ? { mediaPlan: item.mediaPlan } : {}),
          instruction: instr,
        }),
      });
      if (!gen.ok) {
        toast.error("Couldn't generate a new visual. Try again in a moment.");
        return false;
      }
      const body = gen.body as { mediaItems: MediaItem[] };
      if (!(await persistMedia(body.mediaItems))) return false;
      if (autoSchedulesOnVisual) {
        if (await commitSchedule()) toast.success("New visual ready — scheduled.");
      } else {
        toast.success("New visual ready.");
      }
      closeVisual();
      return true;
    });

  const uploadVisual = (file: File) =>
    run("upload", async () => {
      try {
        const items = await upload([file]);
        if (items.length === 0) return false;
        if (!(await persistMedia(items))) return false;
        if (autoSchedulesOnVisual) {
          if (await commitSchedule()) toast.success("Image added — scheduled.");
        } else {
          toast.success("Image swapped.");
        }
        closeVisual();
        return true;
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Couldn't upload that file."
        );
        return false;
      }
    });

  // ── Approve / remove ─────────────────────────────────────────────────
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

  const approve = () =>
    run("approve", async () => {
      const ok = await commitSchedule();
      if (ok) toast.success("Approved — it's scheduled.");
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
  const mediaBusy = busy === "regen-visual" || busy === "upload" || uploading;

  return (
    <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* Native post preview */}
      <div className="relative px-4 pt-4 pb-3">
        <InstagramPostPreview
          username={item.username}
          // While editing, preview the live caption so the user sees exactly
          // what they're writing / what a rewrite produced (mirrors Explore).
          caption={editing ? content : item.content}
          mediaItems={item.mediaItems}
          contentType={displayContentType}
          avatarColor={meta?.color}
          embedded
          expandable
        />
        {mediaBusy ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <SpinnerGapIcon className="h-6 w-6 animate-spin text-gray-500" />
          </div>
        ) : null}
      </div>

      {/* Meta row: time + status */}
      <div className="flex items-center justify-between gap-3 px-4 pb-3">
        <div className="flex min-w-0 items-center gap-1.5 text-gray-500">
          <ClockIcon className="h-4 w-4 shrink-0 text-gray-400" />
          <span className="truncate text-[13px] font-medium tabular-nums text-gray-700">
            {timeLabel}
          </span>
        </div>
        <StatusBadge info={status} />
      </div>

      {/* A published post is read-only — it's already live. */}
      {isPublished ? (
        <div className="border-t border-gray-100 px-4 py-3 text-[12px] text-gray-400">
          Published — it&apos;s already live.
        </div>
      ) : (
        <>
          {/* Tweak tools — same two ghost toggles as the Explore card. */}
          <div className="flex flex-wrap items-center gap-1 border-t border-gray-200 px-2 py-1.5">
            <TweakTabButton
              icon={<NotePencilIcon className="h-4 w-4" />}
              label="Edit caption"
              active={editing}
              disabled={busyAny}
              onClick={() => (editing ? closeCaption() : openCaption())}
            />
            <TweakTabButton
              icon={<ArrowsClockwiseIcon className="h-4 w-4" />}
              label={hasMedia ? "Edit visual" : "Add a visual"}
              active={regenOpen}
              disabled={busyAny}
              onClick={() => (regenOpen ? closeVisual() : openVisual())}
            />
          </div>

          {/* Caption + visual panels — shared with the Explore card. The week
              card persists on Save (the Explore card defers to commit), so it
              passes a Save/Cancel footer. */}
          {editing ? (
            <CaptionEditor
              value={content}
              onChange={setContent}
              disabled={busyAny}
              rewriting={busy === "caption-ai"}
              onRewrite={rewriteCaption}
              footer={
                <div className="flex justify-end gap-2">
                  <button
                    onClick={closeCaption}
                    disabled={busyAny}
                    className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-gray-500 hover:bg-black/[0.04] hover:text-gray-900 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveCaption}
                    disabled={busyAny}
                    className="rounded-lg bg-[#2d2a25] px-4 py-1.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {busy === "caption" ? (
                      <SpinnerGapIcon className="inline h-4 w-4 animate-spin" />
                    ) : (
                      "Save"
                    )}
                  </button>
                </div>
              }
            />
          ) : null}

          {regenOpen ? (
            <VisualEditor
              hasMedia={hasMedia}
              regenerating={busy === "regen-visual"}
              onRegenerate={(instr) => void regenerateVisual(instr)}
              onUpload={(file) => void uploadVisual(file)}
              accept="image/*,video/*"
              disabled={busyAny}
            />
          ) : null}

          {/* Action bar — driven purely by the publishing mode. */}
          <ActionBar
            mode={mode}
            isCommitted={isCommitted}
            needsMedia={needsMedia}
            busy={busy}
            disabled={busyAny}
            onApprove={approve}
            onRemove={remove}
          />
        </>
      )}
    </article>
  );
}

// ─── Action bar (mode-driven) ─────────────────────────────────────────

function ActionBar({
  mode,
  isCommitted,
  needsMedia,
  busy,
  disabled,
  onApprove,
  onRemove,
}: {
  mode: AutopilotMode;
  isCommitted: boolean;
  needsMedia: boolean;
  busy: string | null;
  disabled: boolean;
  onApprove: () => void;
  onRemove: () => void;
}) {
  // "Approve first": a not-yet-committed post needs the user's go-ahead before
  // it's scheduled. A committed post is already on the schedule, so there's
  // nothing left to approve — only remove.
  const showApprove = showApproveAction(mode, isCommitted);

  if (showApprove) {
    return (
      <div className="flex flex-col gap-2 border-t border-gray-200 bg-white px-4 py-3">
        {needsMedia ? (
          <p className="text-[12px] text-gray-500">
            Add a visual before approving.
          </p>
        ) : null}
        <div className="flex items-center gap-2">
          <PrimaryButton
            onClick={onApprove}
            disabled={disabled || needsMedia}
            className="flex-1"
          >
            {busy === "approve" ? (
              <SpinnerGapIcon className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <CheckIcon className="h-4 w-4" weight="bold" />
                Approve
              </>
            )}
          </PrimaryButton>
          <RemoveButton
            onClick={onRemove}
            loading={busy === "remove"}
            disabled={disabled}
          />
        </div>
      </div>
    );
  }

  // "Publish automatically" (or an already-committed post in review): the post
  // goes out on its own — the only thing left to do is pull it.
  const note = needsMedia
    ? "Add a visual so it can go out."
    : isCommitted
      ? "Posts automatically at its time."
      : "Queued to post automatically.";
  return (
    <div className="flex items-center justify-between gap-2 border-t border-gray-200 bg-white px-4 py-3">
      <span className="min-w-0 truncate text-[12px] text-gray-400">
        {note}
      </span>
      <RemoveButton
        onClick={onRemove}
        loading={busy === "remove"}
        disabled={disabled}
      />
    </div>
  );
}

// ─── Small building blocks ───────────────────────────────────────────

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

/** The one and only Remove button — identical wherever it appears. */
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

// ─── Status badge ────────────────────────────────────────────────────

interface StatusVisual {
  label: string;
  text: string;
  bg: string;
  dot: string;
}

function statusInfo(item: TimelineItem, reviewPending: boolean): StatusVisual {
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
