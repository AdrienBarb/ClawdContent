"use client";

import { useEffect } from "react";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { MediaItem } from "@/lib/schemas/mediaItems";
import { cloudinaryFull } from "./cloudinary";

export interface MediaLightboxProps {
  items: MediaItem[];
  index: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIndexChange: (index: number) => void;
}

export function MediaLightbox({
  items,
  index,
  open,
  onOpenChange,
  onIndexChange,
}: MediaLightboxProps) {
  const item = items[index];
  const count = items.length;
  const hasMultiple = count > 1;

  useEffect(() => {
    if (!open || !hasMultiple) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        onIndexChange((index - 1 + count) % count);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        onIndexChange((index + 1) % count);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, hasMultiple, index, count, onIndexChange]);

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(1200px,95vw)] w-auto p-0 gap-0 bg-transparent shadow-none border-0">
        <DialogTitle className="sr-only">Media preview</DialogTitle>

        <div className="relative flex items-center justify-center">
          {item.type === "video" ? (
            <video
              src={item.url}
              controls
              playsInline
              className="max-h-[90vh] max-w-full rounded-2xl"
            />
          ) : (
            // The Cloudinary URL is already size/quality-optimized via the
            // c_limit,w_1600 transform; next/image would force fixed
            // width/height that fights `object-contain` for unknown ratios.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cloudinaryFull(item.url)}
              alt={`Media ${index + 1} of ${count}`}
              className="max-h-[90vh] max-w-full object-contain rounded-2xl"
            />
          )}

          {hasMultiple && (
            <span className="absolute left-2 top-2 rounded-full bg-[#2d2a25]/80 text-white text-xs px-2 py-1 tabular-nums">
              {index + 1} / {count}
            </span>
          )}

          {hasMultiple && (
            <>
              <button
                type="button"
                onClick={() => onIndexChange((index - 1 + count) % count)}
                className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-[#2d2a25]/80 text-white flex items-center justify-center hover:bg-[#2d2a25] transition-colors cursor-pointer"
                aria-label="Previous"
              >
                <CaretLeftIcon className="h-5 w-5" weight="bold" />
              </button>
              <button
                type="button"
                onClick={() => onIndexChange((index + 1) % count)}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-[#2d2a25]/80 text-white flex items-center justify-center hover:bg-[#2d2a25] transition-colors cursor-pointer"
                aria-label="Next"
              >
                <CaretRightIcon className="h-5 w-5" weight="bold" />
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
