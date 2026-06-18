"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import {
  SpinnerGapIcon,
  ArrowsClockwiseIcon,
  NotePencilIcon,
  CalendarIcon,
  PaperPlaneTiltIcon,
} from "@phosphor-icons/react";
import { appRouter } from "@/lib/constants/appRouter";
import { getPlatform } from "@/lib/constants/platforms";
import { InstagramPostPreview } from "@/components/dashboard/previews/InstagramPostPreview";
import { FacebookPostPreview } from "@/components/dashboard/previews/FacebookPostPreview";
import { SchedulePicker } from "@/components/dashboard/SchedulePicker";
import {
  TweakTabButton,
  CaptionEditor,
  VisualEditor,
} from "@/components/dashboard/common/TweakControls";
import { jsonFetch } from "@/components/dashboard/week/datetime";
import { useSupabaseUpload } from "@/lib/hooks/useSupabaseUpload";
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
  const [regenOpen, setRegenOpen] = useState(false);
  // null = "Now" → the CTA posts immediately. Staging a time via the picker
  // flips the CTA to Schedule. ISO string, drops straight into the payload.
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  const [busy, setBusy] = useState<
    "media" | "caption" | "publish" | "schedule" | null
  >(null);
  const { upload } = useSupabaseUpload();

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

  // Use the user's own picture instead of a generated one. Goes straight to the
  // Supabase media bucket (same signed-upload path as the media library), so the
  // returned URL drops into mediaItems and passes the commit route's URL guard.
  const uploadOwn = async (file: File) => {
    setBusy("media");
    try {
      const items = await upload([file]);
      if (items.length === 0) return;
      setMediaItems(items);
      toast.success("Image uploaded.");
      setRegenOpen(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't upload that image."
      );
    } finally {
      setBusy(null);
    }
  };

  // Resolves true when a rewrite was applied so CaptionEditor flips back to the
  // manual box for the user to fine-tune it.
  const rewriteCaption = async (instr: string): Promise<boolean> => {
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
        return false;
      }
      const body = r.body as { content: string };
      setCaption(body.content);
      toast.success("Caption updated.");
      return true;
    } catch {
      toast.error("Couldn't rewrite the caption. Try again.");
      return false;
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

      {/* Caption + visual panels — shared with the week timeline card. */}
      {editing ? (
        <CaptionEditor
          value={caption}
          onChange={setCaption}
          disabled={busy !== null}
          rewriting={busy === "caption"}
          onRewrite={rewriteCaption}
        />
      ) : null}

      {regenOpen ? (
        <VisualEditor
          hasMedia={hasMedia}
          regenerating={busy === "media"}
          onRegenerate={(instr) => void regenerate(instr)}
          onUpload={(file) => void uploadOwn(file)}
          disabled={busy !== null}
        />
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
