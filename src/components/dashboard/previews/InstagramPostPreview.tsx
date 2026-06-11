"use client";

import React from "react";
import Image from "next/image";
import {
  HeartIcon,
  ChatCircleIcon,
  PaperPlaneTiltIcon,
  BookmarkSimpleIcon,
  PlayIcon,
  CameraIcon,
} from "@phosphor-icons/react";

export interface PostPreviewProps {
  username: string;
  caption: string;
  mediaItems: { url: string; type: "image" | "video" }[];
  contentType: string; // "text" | "image" | "video" | "carousel"
  avatarColor?: string; // platform brand color fallback for the avatar circle
  timestampLabel?: string; // e.g. "Scheduled · Tue 9:00 AM"
}

const CAPTION_LIMIT = 125;
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

export function InstagramPostPreview({
  username,
  caption,
  mediaItems,
  contentType,
  avatarColor,
  timestampLabel,
}: PostPreviewProps) {
  const avatarBg = avatarColor ?? "#E4405F";
  const initial = username.charAt(0).toUpperCase() || "?";
  const isVideo = contentType === "video" || mediaItems[0]?.type === "video";
  const isCarousel = !isVideo && mediaItems.length > 1;
  const firstImage = mediaItems.find((m) => m.type === "image");
  const isLongCaption = caption.length > CAPTION_LIMIT;
  const displayedCaption = isLongCaption
    ? `${caption.slice(0, CAPTION_LIMIT).trimEnd()}…`
    : caption;

  return (
    <div className="w-full min-w-[320px] max-w-[470px] overflow-hidden rounded-2xl border border-gray-200 bg-white">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white"
          style={{ backgroundColor: avatarBg }}
        >
          {initial}
        </span>
        <span className="min-w-0 truncate text-[13px] font-bold text-gray-900">
          {username}
        </span>
        <span
          className="ml-auto shrink-0 text-[13px] font-bold tracking-widest text-gray-900"
          aria-hidden="true"
        >
          •••
        </span>
      </div>

      {/* Media */}
      {isVideo ? (
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
      ) : mediaItems.length > 0 ? (
        <div className="relative w-full aspect-[4/5]">
          <Image
            src={mediaItems[0].url}
            alt={`Post by ${username}`}
            fill
            sizes={IMAGE_SIZES}
            unoptimized
            className="object-cover"
          />
          {isCarousel ? (
            <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium tabular-nums text-white">
              1/{mediaItems.length}
            </span>
          ) : null}
        </div>
      ) : (
        <div className="flex w-full items-center justify-center bg-gray-100 aspect-[4/5]">
          <CameraIcon size={32} className="text-gray-400" />
        </div>
      )}

      {/* Carousel dots */}
      {isCarousel ? (
        <div className="flex items-center justify-center gap-1 pt-2.5">
          {mediaItems.map((item, index) => (
            <span
              key={`${item.url}-${index}`}
              className={`h-1.5 w-1.5 rounded-full ${
                index === 0 ? "bg-[#0095f6]" : "bg-gray-300"
              }`}
            />
          ))}
        </div>
      ) : null}

      {/* Action row */}
      <div className="flex items-center gap-4 px-3 pt-2.5">
        <HeartIcon size={24} className="text-gray-900" />
        <ChatCircleIcon size={24} className="-scale-x-100 text-gray-900" />
        <PaperPlaneTiltIcon size={24} className="text-gray-900" />
        <BookmarkSimpleIcon size={24} className="ml-auto text-gray-900" />
      </div>

      {/* Caption */}
      <div className="px-3 pb-3 pt-2">
        {caption ? (
          <p className="line-clamp-2 text-[13px] leading-snug text-gray-900">
            <span className="font-bold">{username}</span>{" "}
            <span>{displayedCaption}</span>
            {isLongCaption ? <span className="text-gray-500"> more</span> : null}
          </p>
        ) : null}
        {timestampLabel ? (
          <p className="pt-1.5 text-[11px] text-gray-400">{timestampLabel}</p>
        ) : null}
      </div>
    </div>
  );
}

export default InstagramPostPreview;
