"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import { Reorder, useDragControls } from "framer-motion";
import {
  SpinnerGapIcon,
  ImageIcon,
  PaperPlaneTiltIcon,
  XIcon,
  DotsSixVerticalIcon,
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
import { MediaLightbox } from "./MediaLightbox";
import { cloudinaryThumbnail } from "./cloudinary";

interface CreatePostModalProps {
  account: { id: string; platform: string; username: string };
  onClose: () => void;
  onCreate: (data: { content: string; mediaItems: MediaItem[] }) => Promise<void>;
}

export default function CreatePostModal({
  account,
  onClose,
  onCreate,
}: CreatePostModalProps) {
  const [content, setContent] = useState("");
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { upload, uploading, progress } = useCloudinaryUpload();

  const platform = getPlatform(account.platform);
  const platformConfig = getPlatformConfig(account.platform);
  const { charLimit, mediaRules } = platformConfig;
  const { maxImages, maxVideos } = mediaRules;

  const hasVideo = mediaItems.some((m) => m.type === "video");
  const hasImage = mediaItems.some((m) => m.type === "image");
  const imagesFull =
    mediaItems.filter((m) => m.type === "image").length >= maxImages;
  const videosFull =
    mediaItems.filter((m) => m.type === "video").length >= maxVideos;
  const addDisabled =
    uploading || (hasVideo && videosFull) || (hasImage && imagesFull);

  let acceptAttr =
    "image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime";
  if (hasVideo) acceptAttr = "video/mp4,video/quicktime";
  else if (hasImage && !imagesFull)
    acceptAttr = "image/jpeg,image/png,image/gif,image/webp";
  else if (maxImages === 0) acceptAttr = "video/mp4,video/quicktime";
  else if (maxVideos === 0)
    acceptAttr = "image/jpeg,image/png,image/gif,image/webp";

  const trimmedLength = content.trim().length;
  // Soft warning, not a hard block — X Premium users (and anyone else with
  // an extended limit) can post beyond the platform default. Counter goes
  // red past the limit but Create stays clickable; the platform itself is
  // the final authority on what gets accepted.
  const overLimit = charLimit !== null && trimmedLength > charLimit;
  const submitDisabled = trimmedLength === 0 || uploading || submitting;
  const dismissBlocked = uploading || submitting;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      const tentative = Array.from(files).map((f) => ({
        url: "https://res.cloudinary.com/_/preflight",
        type: f.type.startsWith("video/")
          ? ("video" as const)
          : ("image" as const),
      }));
      const preflight = validateMediaItems(
        [...mediaItems, ...tentative],
        account.platform
      );
      if (!preflight.ok) {
        toast.error(preflight.error);
        return;
      }
      const uploaded = await upload(files);
      let rejected = false;
      setMediaItems((prev) => {
        const next = [...prev, ...uploaded];
        const v = validateMediaItems(next, account.platform);
        if (!v.ok) {
          rejected = true;
          toast.error(v.error);
          return prev;
        }
        return next;
      });
      if (rejected) return;
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Couldn't upload that file. Try a different one.";
      toast.error(msg);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeItem = (idx: number) => {
    setMediaItems((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (next.length === 0) setLightboxIdx(null);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (submitDisabled) return;
    setSubmitting(true);
    try {
      await onCreate({ content: content.trim(), mediaItems });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !dismissBlocked) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden rounded-2xl">
        <DialogTitle className="sr-only">Create post</DialogTitle>

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
              {account.username}
            </p>
            <p className="text-xs text-gray-500">New post</p>
          </div>
        </div>

        <div className="px-5 py-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full min-h-[180px] text-sm text-gray-900 leading-relaxed resize-none focus:outline-none placeholder:text-gray-400"
            placeholder="Write your post..."
            autoFocus
          />
          <div
            className={`mt-1 text-[11px] tabular-nums ${
              overLimit ? "text-red-500" : "text-gray-400"
            }`}
          >
            {charLimit === null
              ? `${content.length}`
              : `${content.length} / ${charLimit}`}
          </div>
          {mediaItems.length > 0 && (
            <Reorder.Group
              axis="x"
              values={mediaItems}
              onReorder={setMediaItems}
              className="mt-3 flex flex-wrap gap-2"
            >
              {mediaItems.map((item, idx) => (
                <ReorderableThumb
                  key={item.url}
                  item={item}
                  idx={idx}
                  onClick={() => setLightboxIdx(idx)}
                  onRemove={() => removeItem(idx)}
                />
              ))}
            </Reorder.Group>
          )}
          {lightboxIdx !== null && mediaItems.length > 0 && (
            <MediaLightbox
              items={mediaItems}
              index={Math.min(lightboxIdx, mediaItems.length - 1)}
              open
              onOpenChange={(o) => {
                if (!o) setLightboxIdx(null);
              }}
              onIndexChange={setLightboxIdx}
            />
          )}
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={() => fileInputRef.current?.click()}
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
            ref={fileInputRef}
            type="file"
            accept={acceptAttr}
            multiple={!hasVideo && maxImages > 1}
            onChange={handleFileSelect}
            disabled={uploading || submitting}
            className="hidden"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={dismissBlocked}
              className="rounded-lg px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitDisabled}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium text-white transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background:
                  "linear-gradient(180deg, #ec6f5b 0%, #c84a35 100%)",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 2px rgba(200,74,53,0.25)",
              }}
            >
              {submitting ? (
                <SpinnerGapIcon className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <PaperPlaneTiltIcon className="h-3.5 w-3.5" />
              )}
              Create
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReorderableThumb({
  item,
  idx,
  onClick,
  onRemove,
}: {
  item: MediaItem;
  idx: number;
  onClick: () => void;
  onRemove: () => void;
}) {
  const dragControls = useDragControls();
  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={dragControls}
      className="relative"
    >
      <button
        type="button"
        onClick={onClick}
        className="block cursor-zoom-in"
        aria-label={`Open media ${idx + 1}`}
      >
        {item.type === "video" ? (
          <video
            src={item.url}
            className="h-24 w-24 rounded-lg object-cover pointer-events-none"
            aria-hidden
            preload="metadata"
            playsInline
            muted
          />
        ) : (
          <Image
            src={cloudinaryThumbnail(item.url)}
            alt={`Attached image ${idx + 1}`}
            className="h-24 w-24 rounded-lg object-cover pointer-events-none"
            width={96}
            height={96}
          />
        )}
      </button>
      <button
        type="button"
        onPointerDown={(e) => dragControls.start(e)}
        className="absolute bottom-1 left-1 h-5 w-5 rounded-full bg-[#2d2a25]/70 text-white flex items-center justify-center cursor-grab active:cursor-grabbing touch-none hover:bg-[#2d2a25]"
        aria-label="Drag to reorder"
      >
        <DotsSixVerticalIcon className="h-3 w-3" weight="bold" />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-gray-900 text-white flex items-center justify-center cursor-pointer"
        aria-label={`Remove media ${idx + 1}`}
      >
        <XIcon className="h-3 w-3" weight="bold" />
      </button>
    </Reorder.Item>
  );
}
