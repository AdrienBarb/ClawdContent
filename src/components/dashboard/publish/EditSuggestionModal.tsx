"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import {
  SpinnerGapIcon,
  ArrowsClockwiseIcon,
  CheckIcon,
  PencilSimpleIcon,
  ImageIcon,
  LightningIcon,
  TextAaIcon,
  HashIcon,
  ArrowsOutIcon,
  ArrowsInIcon,
  SuitcaseIcon,
  XIcon,
} from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { getPlatform } from "@/lib/constants/platforms";
import { getPlatformConfig } from "@/lib/insights/platformConfig";
import { useCloudinaryUpload } from "@/lib/hooks/useCloudinaryUpload";
import { validateMediaItems } from "@/lib/services/mediaValidation";
import type { MediaItem } from "@/lib/schemas/mediaItems";
import type { Suggestion } from "./types";

export default function EditSuggestionModal({
  suggestion,
  onClose,
  onSave,
}: {
  suggestion: Suggestion;
  onClose: () => void;
  onSave: (updated: { content: string; mediaItems: MediaItem[] }) => void;
}) {
  const [content, setContent] = useState(suggestion.content);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(
    suggestion.mediaItems
  );
  const [rewriting, setRewriting] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const { upload, uploading, progress } = useCloudinaryUpload();

  const platform = getPlatform(suggestion.socialAccount.platform);
  const platformConfig = getPlatformConfig(suggestion.socialAccount.platform);
  const { maxImages, maxVideos } = platformConfig.mediaRules;

  const hasVideo = mediaItems.some((m) => m.type === "video");
  const hasImage = mediaItems.some((m) => m.type === "image");
  const imagesFull =
    mediaItems.filter((m) => m.type === "image").length >= maxImages;
  const videosFull =
    mediaItems.filter((m) => m.type === "video").length >= maxVideos;
  const addDisabled =
    uploading || (hasVideo && videosFull) || (hasImage && imagesFull);

  let acceptAttr = "image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime";
  if (hasVideo) acceptAttr = "video/mp4,video/quicktime";
  else if (hasImage && !imagesFull) acceptAttr = "image/jpeg,image/png,image/gif,image/webp";
  else if (maxImages === 0) acceptAttr = "video/mp4,video/quicktime";
  else if (maxVideos === 0) acceptAttr = "image/jpeg,image/png,image/gif,image/webp";

  const handleRewrite = async (instruction: string) => {
    if (!content.trim()) return;
    setRewriting(true);
    try {
      const saveRes = await fetch(`/api/suggestions/${suggestion.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!saveRes.ok) {
        toast.error("Couldn't update the post. Try again.");
        return;
      }
      const res = await fetch(`/api/suggestions/${suggestion.id}/rewrite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction }),
      });
      if (!res.ok) {
        toast.error("Couldn't rewrite the post. Try again.");
        return;
      }
      const data = await res.json().catch(() => null);
      if (data?.content) setContent(data.content);
    } catch {
      toast.error("Couldn't rewrite the post. Try again.");
    } finally {
      setRewriting(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      const tentative = Array.from(files).map((f) => ({
        url: "https://res.cloudinary.com/_/preflight",
        type: f.type.startsWith("video/") ? ("video" as const) : ("image" as const),
      }));
      const preflight = validateMediaItems(
        [...mediaItems, ...tentative],
        suggestion.socialAccount.platform
      );
      if (!preflight.ok) {
        toast.error(preflight.error);
        return;
      }
      const uploaded = await upload(files);
      let rejected = false;
      setMediaItems((prev) => {
        const next = [...prev, ...uploaded];
        const v = validateMediaItems(next, suggestion.socialAccount.platform);
        if (!v.ok) {
          rejected = true;
          toast.error(v.error);
          return prev;
        }
        return next;
      });
      if (rejected) return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Couldn't upload that file. Try a different one.";
      toast.error(msg);
    } finally {
      if (editFileInputRef.current) editFileInputRef.current.value = "";
    }
  };

  const removeItem = (idx: number) => {
    setMediaItems((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden rounded-2xl">
        <DialogTitle className="sr-only">Edit post</DialogTitle>

        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          {platform && (
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full text-white shrink-0"
              style={{ backgroundColor: platform.color }}
            >
              {platform.icon}
            </span>
          )}
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">
              {suggestion.socialAccount.username}
            </p>
            <p className="text-xs text-gray-500">Post idea</p>
          </div>
        </div>

        <div className="px-5 py-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full min-h-[180px] text-sm text-gray-900 leading-relaxed resize-none focus:outline-none placeholder:text-gray-400"
            placeholder="Write your post..."
          />
          {mediaItems.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {mediaItems.map((item, idx) => (
                <div key={`${item.url}-${idx}`} className="relative">
                  {item.type === "video" ? (
                    <video
                      src={item.url}
                      className="h-24 w-24 rounded-lg object-cover"
                      aria-label={`Attached video ${idx + 1}`}
                      preload="metadata"
                      playsInline
                      muted
                    />
                  ) : (
                    <Image
                      src={item.url}
                      alt={`Attached image ${idx + 1}`}
                      className="h-24 w-24 rounded-lg object-cover"
                      width={96}
                      height={96}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-gray-900 text-white flex items-center justify-center cursor-pointer"
                    aria-label="Remove media"
                  >
                    <XIcon className="h-3 w-3" weight="bold" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 px-5 py-3 border-t border-gray-100 overflow-x-auto">
          <LightningIcon
            className="h-4 w-4 text-gray-400 shrink-0"
            weight="fill"
          />
          {[
            { key: "fix", label: "Fix", icon: <CheckIcon className="h-3.5 w-3.5" /> },
            {
              key: "rewrite",
              label: "Rewrite",
              icon: <ArrowsClockwiseIcon className="h-3.5 w-3.5" />,
            },
            {
              key: "shorter",
              label: "Shorter",
              icon: <ArrowsInIcon className="h-3.5 w-3.5" />,
            },
            {
              key: "longer",
              label: "Longer",
              icon: <ArrowsOutIcon className="h-3.5 w-3.5" />,
            },
            {
              key: "hashtags",
              label: "Hashtags",
              icon: <HashIcon className="h-3.5 w-3.5" />,
            },
            {
              key: "casual",
              label: "Casual",
              icon: <TextAaIcon className="h-3.5 w-3.5" />,
            },
            {
              key: "professional",
              label: "Pro",
              icon: <SuitcaseIcon className="h-3.5 w-3.5" />,
            },
          ].map((btn) => (
            <button
              key={btn.key}
              onClick={() => handleRewrite(btn.key)}
              disabled={!content.trim() || rewriting}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
            >
              {btn.icon}
              {btn.label}
            </button>
          ))}
          {rewriting && (
            <SpinnerGapIcon className="h-4 w-4 animate-spin text-gray-400 shrink-0 ml-1" />
          )}
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={() => editFileInputRef.current?.click()}
            disabled={addDisabled}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50"
            title={
              hasVideo && videosFull
                ? "Remove the video first to add photos"
                : hasImage && imagesFull
                  ? `Up to ${maxImages} photo${maxImages === 1 ? "" : "s"} on ${platformConfig.displayName}`
                  : undefined
            }
          >
            {uploading ? (
              <SpinnerGapIcon className="h-4 w-4 animate-spin" />
            ) : (
              <ImageIcon className="h-4 w-4" />
            )}
            {uploading
              ? progress.total > 1
                ? `Uploading ${progress.current}/${progress.total}…`
                : "Uploading…"
              : hasVideo
                ? "Replace video"
                : maxImages > 1
                  ? "Add photos"
                  : "Add photo"}
          </button>
          <input
            ref={editFileInputRef}
            type="file"
            accept={acceptAttr}
            multiple={!hasVideo && maxImages > 1}
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSave({ content, mediaItems })}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium text-white transition-colors cursor-pointer"
              style={{ backgroundColor: "#e8614d" }}
            >
              <PencilSimpleIcon className="h-3.5 w-3.5" />
              Save
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
