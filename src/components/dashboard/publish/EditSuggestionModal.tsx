"use client";

import { useRef, useState } from "react";
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
import type { Suggestion } from "./types";

export default function EditSuggestionModal({
  suggestion,
  onClose,
  onSave,
}: {
  suggestion: Suggestion;
  onClose: () => void;
  onSave: (updated: {
    content: string;
    mediaUrl?: string;
    mediaType?: string;
  }) => void;
}) {
  const [content, setContent] = useState(suggestion.content);
  const [mediaUrl, setMediaUrl] = useState<string | null>(suggestion.mediaUrl);
  const [mediaType, setMediaType] = useState<string | null>(
    suggestion.mediaType
  );
  const [rewriting, setRewriting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const platform = getPlatform(suggestion.socialAccount.platform);

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
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "postclaw_unsigned");
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`,
        { method: "POST", body: formData }
      );
      if (!res.ok) {
        toast.error("Couldn't upload that file. Try a different one.");
        return;
      }
      const data = await res.json().catch(() => null);
      if (!data?.secure_url) {
        toast.error("Couldn't upload that file. Try a different one.");
        return;
      }
      setMediaUrl(data.secure_url);
      setMediaType(data.resource_type === "video" ? "video" : "image");
    } catch {
      toast.error("Couldn't upload that file. Try a different one.");
    } finally {
      setUploading(false);
      if (editFileInputRef.current) editFileInputRef.current.value = "";
    }
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
          {mediaUrl && (
            <div className="mt-3 relative inline-block">
              {mediaType === "video" ? (
                <video
                  src={mediaUrl}
                  className="h-24 rounded-lg"
                  controls
                  aria-label="Attached video"
                />
              ) : (
                <img
                  src={mediaUrl}
                  alt="Attached image"
                  className="h-24 w-24 rounded-lg object-cover"
                />
              )}
              <button
                onClick={() => {
                  setMediaUrl(null);
                  setMediaType(null);
                }}
                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-gray-900 text-white flex items-center justify-center cursor-pointer"
              >
                <XIcon className="h-3 w-3" weight="bold" />
              </button>
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
            disabled={uploading}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            {uploading ? (
              <SpinnerGapIcon className="h-4 w-4 animate-spin" />
            ) : (
              <ImageIcon className="h-4 w-4" />
            )}
            {uploading ? "Uploading..." : "Add photo"}
          </button>
          <input
            ref={editFileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                onSave({
                  content,
                  mediaUrl: mediaUrl ?? undefined,
                  mediaType: mediaType ?? undefined,
                })
              }
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
