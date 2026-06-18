"use client";

import { useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SpinnerGapIcon, TrashIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { appRouter } from "@/lib/constants/appRouter";
import { useSupabaseUpload } from "@/lib/hooks/useSupabaseUpload";
import { jsonFetch, localInputToIso, toLocalInputValue } from "./datetime";
import type { TimelineItem } from "./types";

interface Props {
  item: TimelineItem | null;
  timezone: string | null;
  onClose: () => void;
  /** Refetch timeline data after any mutation. */
  onChanged: () => void;
}

export function PostEditSheet({ item, timezone, onClose, onChanged }: Props) {
  const [content, setContent] = useState(item?.content ?? "");
  const [timeValue, setTimeValue] = useState(
    toLocalInputValue(item?.scheduledAt ?? null, timezone)
  );
  const [busy, setBusy] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { upload, uploading } = useSupabaseUpload();

  if (!item) return null;
  const isLocal = item.kind === "local";

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

  /** Persist caption + time edits. Shared by Save AND the commit actions —
   *  committing must never silently discard what's in the form. */
  const persistEdits = async (): Promise<boolean> => {
    const newIso = localInputToIso(timeValue, timezone);
    if (isLocal) {
      if (content !== item.content) {
        const r = await jsonFetch(`${appRouter.api.suggestions}/${item.id}`, {
          method: "PATCH",
          body: JSON.stringify({ content }),
        });
        if (!r.ok) {
          toast.error("Couldn't save the caption.");
          return false;
        }
      }
      if (newIso !== item.scheduledAt) {
        const r = await jsonFetch(`${appRouter.api.suggestions}/${item.id}`, {
          method: "PATCH",
          body: JSON.stringify({ scheduledAt: newIso }),
        });
        if (!r.ok) {
          toast.error("Couldn't save the new time.");
          return false;
        }
      }
      return true;
    }
    const payload: Record<string, unknown> = { postId: item.id };
    if (content !== item.content) payload.content = content;
    if (newIso && newIso !== item.scheduledAt) payload.scheduledAt = newIso;
    if (Object.keys(payload).length > 1) {
      const r = await jsonFetch(appRouter.api.postsUpdate, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        toast.error("Couldn't update the post.");
        return false;
      }
    }
    return true;
  };

  const saveChanges = () =>
    run("save", async () => {
      if (!(await persistEdits())) return false;
      toast.success("Saved");
      onClose();
      return true;
    });

  const replaceMedia = async (file: File) => {
    await run("upload", async () => {
      try {
        const items = await upload([file]);
        if (items.length === 0) return false;
        const r = await jsonFetch(`${appRouter.api.suggestions}/${item.id}`, {
          method: "PATCH",
          body: JSON.stringify({ mediaItems: items }),
        });
        if (!r.ok) {
          toast.error("Couldn't attach that file.");
          return false;
        }
        toast.success("Media replaced.");
        return true;
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Couldn't upload that file."
        );
        return false;
      }
    });
  };

  const veto = () =>
    run("veto", async () => {
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
      toast.success("Post removed — it won't be published.");
      onClose();
      return true;
    });

  const regenerateImage = () =>
    run("media", async () => {
      const r = await jsonFetch("/api/autopilot/regenerate-media", {
        method: "POST",
        body: JSON.stringify({ suggestionId: item.id }),
      });
      if (!r.ok) {
        toast.error("Couldn't generate a new visual. Try again in a moment.");
        return false;
      }
      toast.success("New visual ready.");
      return true;
    });

  const commit = (action: "publish" | "schedule") =>
    run(action, async () => {
      // Persist whatever is in the form first — committing must publish the
      // caption/time the user is looking at, not the stale stored version.
      if (!(await persistEdits())) return false;
      const r = await jsonFetch(`${appRouter.api.suggestions}/${item.id}`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      if (!r.ok) {
        const body = r.body as { error?: string; message?: string } | null;
        toast.error(body?.message ?? "Couldn't commit this post.");
        return false;
      }
      toast.success(action === "publish" ? "Publishing now." : "Scheduled.");
      onClose();
      return true;
    });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold tracking-tight">
            Edit post · @{item.username}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">
              Caption
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="w-full resize-y rounded-lg border border-gray-200 bg-white p-3 text-[13px] leading-relaxed outline-none focus:border-gray-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">
              Publish time
            </label>
            <input
              type="datetime-local"
              value={timeValue}
              onChange={(e) => setTimeValue(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-gray-400"
            />
          </div>

          {isLocal && item.contentType !== "text" ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={regenerateImage}
                disabled={busy !== null}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[13px] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {busy === "media" ? (
                  <SpinnerGapIcon className="inline h-4 w-4 animate-spin" />
                ) : (
                  "Generate a new visual"
                )}
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={busy !== null || uploading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[13px] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {busy === "upload" || uploading ? (
                  <SpinnerGapIcon className="h-4 w-4 animate-spin" />
                ) : (
                  <UploadSimpleIcon className="h-4 w-4" />
                )}
                Use my own
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void replaceMedia(f);
                  e.target.value = "";
                }}
              />
            </div>
          ) : null}

          <div className="flex items-center justify-between border-t border-gray-100 pt-4">
            <button
              onClick={veto}
              disabled={busy !== null}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-[#fef2f0] hover:text-[#c84a35] disabled:opacity-50"
              title="Don't publish this post"
            >
              <TrashIcon className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2">
              {isLocal && item.status !== "needs_media" ? (
                <>
                  <button
                    onClick={saveChanges}
                    disabled={busy !== null}
                    className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-gray-500 hover:bg-black/[0.04] hover:text-gray-900 disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => commit("publish")}
                    disabled={busy !== null}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[13px] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Post now
                  </button>
                  <button
                    onClick={() => commit("schedule")}
                    disabled={busy !== null || !timeValue}
                    className="rounded-lg px-4 py-1.5 text-[13px] font-semibold text-white disabled:opacity-50"
                    style={{
                      background:
                        "linear-gradient(180deg, #ec6f5b 0%, #c84a35 100%)",
                    }}
                  >
                    Schedule
                  </button>
                </>
              ) : (
                <button
                  onClick={saveChanges}
                  disabled={busy !== null}
                  className="rounded-lg px-4 py-1.5 text-[13px] font-semibold text-white disabled:opacity-50"
                  style={{
                    background:
                      "linear-gradient(180deg, #ec6f5b 0%, #c84a35 100%)",
                  }}
                >
                  {busy === "save" ? (
                    <SpinnerGapIcon className="inline h-4 w-4 animate-spin" />
                  ) : (
                    "Save"
                  )}
                </button>
              )}
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
