"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  GlobeHemisphereWestIcon,
  ThumbsUpIcon,
  ChatCircleIcon,
  ShareFatIcon,
  PlayIcon,
} from "@phosphor-icons/react";

export interface PostPreviewProps {
  username: string;
  caption: string;
  mediaItems: { url: string; type: "image" | "video" }[];
  contentType: string; // "text" | "image" | "video" | "carousel"
  avatarColor?: string; // platform brand color fallback for the avatar circle
  timestampLabel?: string; // e.g. "Scheduled · Tue 9:00 AM"
  embedded?: boolean; // drop the standalone max-width when nested in a manage card
  expandable?: boolean; // make "See more" interactive so the full caption can be read
}

const CAPTION_LIMIT = 280;
const IMAGE_SIZES = "(max-width: 640px) 100vw, 470px";

function PlayOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/40">
        <PlayIcon size={28} weight="fill" className="ml-0.5 text-white/90" />
      </div>
    </div>
  );
}

export function FacebookPostPreview({
  username,
  caption,
  mediaItems,
  contentType,
  avatarColor,
  timestampLabel,
  embedded,
  expandable,
}: PostPreviewProps) {
  const avatarBg = avatarColor ?? "#0866FF";
  const initial = username.charAt(0).toUpperCase() || "?";
  const isVideo = contentType === "video" || mediaItems[0]?.type === "video";
  const firstImage = mediaItems.find((m) => m.type === "image");
  const gridItems = mediaItems.slice(0, 2);
  const extraCount = mediaItems.length - 2;
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const isLongCaption = caption.length > CAPTION_LIMIT;
  const showFullCaption = expandable && captionExpanded;

  return (
    <div
      className={
        embedded
          ? "w-full overflow-hidden rounded-xl border border-gray-200 bg-white"
          : "w-full min-w-[320px] max-w-[470px] overflow-hidden rounded-2xl border border-gray-200 bg-white"
      }
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[14px] font-semibold text-white"
          style={{ backgroundColor: avatarBg }}
        >
          {initial}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[14px] font-bold leading-tight text-gray-900">
            {username}
          </p>
          <p className="flex items-center gap-1 text-[12px] leading-tight text-gray-500">
            {timestampLabel ? (
              <>
                <span className="truncate">{timestampLabel}</span>
                <span aria-hidden="true">·</span>
              </>
            ) : null}
            <GlobeHemisphereWestIcon size={12} className="shrink-0" />
          </p>
        </div>
      </div>

      {/* Caption (above media — Facebook order) */}
      {caption ? (
        <div className="px-3 pb-3">
          <p
            className={`text-[14px] leading-relaxed text-gray-900 ${
              showFullCaption ? "" : "line-clamp-4"
            }`}
          >
            {caption}
          </p>
          {isLongCaption && expandable ? (
            <button
              type="button"
              onClick={() => setCaptionExpanded((v) => !v)}
              className="mt-1 text-[13px] font-medium text-gray-500 hover:text-gray-700"
            >
              {captionExpanded ? "See less" : "See more"}
            </button>
          ) : isLongCaption ? (
            <span className="mt-1 inline-block text-[13px] text-gray-500">
              See more
            </span>
          ) : null}
        </div>
      ) : null}

      {/* Media */}
      {mediaItems.length === 0 || contentType === "text" ? null : isVideo ? (
        <div className="relative max-h-[480px] w-full bg-gray-900 aspect-[9/16]">
          {firstImage ? (
            <Image
              src={firstImage.url}
              alt={`Post by ${username}`}
              fill
              sizes={IMAGE_SIZES}
              unoptimized
              className="object-cover"
            />
          ) : null}
          <PlayOverlay />
        </div>
      ) : mediaItems.length > 1 ? (
        <div className="grid grid-cols-2 gap-0.5">
          {gridItems.map((item, index) => (
            <div
              key={`${item.url}-${index}`}
              className="relative w-full aspect-square bg-gray-100"
            >
              <Image
                src={item.url}
                alt={`Post by ${username}`}
                fill
                sizes="(max-width: 640px) 50vw, 235px"
                unoptimized
                className="object-cover"
              />
              {index === 1 && extraCount > 0 ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <span className="text-[20px] font-semibold tabular-nums text-white">
                    +{extraCount}
                  </span>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="relative w-full aspect-[4/5] bg-gray-100">
          <Image
            src={mediaItems[0].url}
            alt={`Post by ${username}`}
            fill
            sizes={IMAGE_SIZES}
            unoptimized
            className="object-cover"
          />
        </div>
      )}

      {/* Action bar */}
      <div className="mx-3 border-t border-gray-200">
        <div className="flex items-stretch py-1">
          <button
            type="button"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[13px] font-medium text-gray-500 hover:bg-gray-50"
          >
            <ThumbsUpIcon size={18} />
            Like
          </button>
          <button
            type="button"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[13px] font-medium text-gray-500 hover:bg-gray-50"
          >
            <ChatCircleIcon size={18} />
            Comment
          </button>
          <button
            type="button"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[13px] font-medium text-gray-500 hover:bg-gray-50"
          >
            <ShareFatIcon size={18} />
            Share
          </button>
        </div>
      </div>
    </div>
  );
}

export default FacebookPostPreview;
