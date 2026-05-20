"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import {
  ArrowsClockwiseIcon,
  CheckCircleIcon,
  SpinnerGapIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SchedulePicker } from "@/components/dashboard/SchedulePicker";
import { appRouter } from "@/lib/constants/appRouter";
import type { PlatformSuggestion } from "@/components/dashboard/platform/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestion: PlatformSuggestion;
  platform: string;
  charLimit: number | null;
  imageRequired: boolean;
  onMutated: () => void;
}

export default function PostEditDrawer({
  open,
  onOpenChange,
  suggestion,
  platform,
  charLimit,
  imageRequired,
  onMutated,
}: Props) {
  const [content, setContent] = useState(suggestion.content);
  const [scheduledAt, setScheduledAt] = useState<string | null>(
    suggestion.scheduledAt
  );
  const [savingContent, setSavingContent] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [approving, setApproving] = useState(false);

  // Reset local state whenever a different suggestion is loaded.
  const lastIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (lastIdRef.current !== suggestion.id) {
      lastIdRef.current = suggestion.id;
      setContent(suggestion.content);
      setScheduledAt(suggestion.scheduledAt);
    }
  }, [suggestion.id, suggestion.content, suggestion.scheduledAt]);

  const contentChanged = content !== suggestion.content;
  const isLocked = !!suggestion.publishedExternalId;
  const isApprovalPending =
    suggestion.approvalRequired &&
    !suggestion.approvedAt &&
    !suggestion.publishedExternalId;
  const overLimit = charLimit !== null && content.length > charLimit;

  async function saveContent() {
    if (overLimit) {
      toast.error(
        `Caption is over the ${charLimit}-character limit for ${platform}.`
      );
      return;
    }
    setSavingContent(true);
    try {
      await axios.patch(appRouter.api.post(suggestion.id), {
        content,
      });
      toast.success("Saved.");
      onMutated();
    } catch (err) {
      toast.error(extractMessage(err, "Couldn't save the caption."));
    } finally {
      setSavingContent(false);
    }
  }

  async function pickSchedule(date: Date) {
    const iso = date.toISOString();
    setSavingContent(true);
    try {
      await axios.patch(appRouter.api.post(suggestion.id), {
        scheduledAt: iso,
      });
      setScheduledAt(iso);
      toast.success("Schedule updated.");
      onMutated();
    } catch (err) {
      toast.error(extractMessage(err, "Couldn't reschedule."));
    } finally {
      setSavingContent(false);
    }
  }

  async function regenerateImage() {
    setRegenerating(true);
    try {
      await axios.post(appRouter.api.postRegenerateImage(suggestion.id));
      toast.success("New image on the way.");
      onMutated();
    } catch (err) {
      toast.error(extractMessage(err, "Couldn't regenerate the image."));
    } finally {
      setRegenerating(false);
    }
  }

  async function deletePost() {
    if (!window.confirm("Delete this post? This can't be undone.")) return;
    setDeleting(true);
    try {
      await axios.delete(appRouter.api.post(suggestion.id));
      toast.success("Deleted.");
      onOpenChange(false);
      onMutated();
    } catch (err) {
      toast.error(extractMessage(err, "Couldn't delete the post."));
      setDeleting(false);
    }
  }

  async function approve() {
    setApproving(true);
    try {
      await axios.post(appRouter.api.postApprove(suggestion.id));
      toast.success("Approved — heading out at the scheduled time.");
      onOpenChange(false);
      onMutated();
    } catch (err) {
      toast.error(extractMessage(err, "Couldn't approve. Try again."));
    } finally {
      setApproving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="border-b border-gray-100 pb-3">
          <SheetTitle className="text-[15px] font-semibold tracking-tight">
            Edit post
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5 py-4">
          {isLocked && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-800">
              This post is already scheduled with the platform. Edits stop here.
            </div>
          )}

          {/* Image preview ------------------------------------------ */}
          {(suggestion.imageUrl || imageRequired) && (
            <div>
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                  Image
                </p>
                {suggestion.imageUrl && !isLocked && (
                  <button
                    type="button"
                    onClick={regenerateImage}
                    disabled={regenerating}
                    className="inline-flex items-center gap-1.5 text-[12px] font-medium text-gray-700 hover:text-gray-900 disabled:opacity-50"
                  >
                    {regenerating ? (
                      <SpinnerGapIcon size={13} className="animate-spin" />
                    ) : (
                      <ArrowsClockwiseIcon size={13} weight="bold" />
                    )}
                    Regenerate
                  </button>
                )}
              </div>
              <div className="mt-2 overflow-hidden rounded-xl bg-gray-100">
                {suggestion.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={suggestion.imageUrl}
                    alt=""
                    className="block w-full"
                  />
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center text-[12px] text-gray-400">
                    {regenerating ? "Generating…" : "No image yet"}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Caption ---------------------------------------------- */}
          <div>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                Caption
              </p>
              {charLimit !== null && (
                <p
                  className={`text-[11px] tabular-nums ${
                    overLimit ? "text-red-600" : "text-gray-500"
                  }`}
                >
                  {content.length}/{charLimit}
                </p>
              )}
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isLocked}
              rows={8}
              className="mt-2 w-full resize-y rounded-xl border border-gray-200 bg-white px-3 py-2 text-[13px] leading-relaxed text-gray-900 focus:border-gray-400 focus:outline-none disabled:bg-gray-50"
            />
            {contentChanged && !isLocked && (
              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setContent(suggestion.content)}
                  className="text-[12px] text-gray-500 hover:text-gray-700"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={saveContent}
                  disabled={savingContent || overLimit}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[linear-gradient(180deg,_#ec6f5b_0%,_#c84a35_100%)] px-3 py-1.5 text-[12.5px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),_0_1px_2px_rgba(200,74,53,0.25)] disabled:opacity-50"
                >
                  {savingContent && (
                    <SpinnerGapIcon size={13} className="animate-spin" />
                  )}
                  Save caption
                </button>
              </div>
            )}
          </div>

          {/* Schedule ----------------------------------------------- */}
          {!isLocked && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                Schedule
              </p>
              <div className="mt-2 flex items-center gap-2">
                <p className="flex-1 text-[13px] text-gray-800">
                  {scheduledAt
                    ? new Date(scheduledAt).toLocaleString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : "No time set yet"}
                </p>
                <SchedulePicker
                  disabled={isLocked}
                  onSchedule={pickSchedule}
                  platform={platform}
                  variant="compact"
                  compactLabel={scheduledAt ? "Change" : "Pick time"}
                />
              </div>
            </div>
          )}

          {/* Approve (approval mode) -------------------------------- */}
          {isApprovalPending && (
            <button
              type="button"
              onClick={approve}
              disabled={approving || !scheduledAt}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[linear-gradient(180deg,_#ec6f5b_0%,_#c84a35_100%)] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),_0_1px_2px_rgba(200,74,53,0.25)] disabled:opacity-50"
            >
              {approving ? (
                <SpinnerGapIcon size={14} className="animate-spin" />
              ) : (
                <CheckCircleIcon size={14} weight="fill" />
              )}
              Approve & schedule
            </button>
          )}

          {/* Reasoning footnote -------------------------------------- */}
          {suggestion.reasoning && (
            <p className="border-t border-gray-100 pt-3 text-[12px] italic leading-relaxed text-gray-500">
              Why this post: {suggestion.reasoning}
            </p>
          )}

          {/* Delete -------------------------------------------------- */}
          {!isLocked && (
            <div className="border-t border-gray-100 pt-3">
              <button
                type="button"
                onClick={deletePost}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12.5px] text-gray-500 hover:bg-[#fef2f0] hover:text-[#c84a35] disabled:opacity-50"
              >
                {deleting ? (
                  <SpinnerGapIcon size={13} className="animate-spin" />
                ) : (
                  <TrashIcon size={13} weight="bold" />
                )}
                Delete post
              </button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function extractMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const m = err.response?.data?.message;
    if (typeof m === "string" && m.length > 0) return m;
  }
  return fallback;
}
