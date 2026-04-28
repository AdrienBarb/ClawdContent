"use client";

import { useState } from "react";
import type { MediaItem } from "@/lib/schemas/mediaItems";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = "postclaw_unsigned";
const MAX_BYTES = 100 * 1024 * 1024;
const ALLOWED_PREFIXES = ["image/", "video/"];

interface CloudinaryResponse {
  secure_url: string;
  resource_type: "image" | "video" | "raw";
}

function preflight(file: File): void {
  if (file.size > MAX_BYTES) {
    throw new Error(`${file.name} is too large (max 100 MB).`);
  }
  if (!ALLOWED_PREFIXES.some((p) => file.type.startsWith(p))) {
    throw new Error(`${file.name} isn't a supported photo or video.`);
  }
}

async function uploadOne(file: File): Promise<MediaItem> {
  preflight(file);
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,
    { method: "POST", body: formData }
  );
  if (!res.ok) {
    throw new Error(`Cloudinary upload failed (${res.status})`);
  }
  const data = (await res.json()) as CloudinaryResponse;
  if (!data?.secure_url) {
    throw new Error("Cloudinary returned no secure_url");
  }
  if (data.resource_type !== "image" && data.resource_type !== "video") {
    throw new Error(`Unsupported Cloudinary resource_type: ${data.resource_type}`);
  }
  return {
    url: data.secure_url,
    type: data.resource_type,
  };
}

export function useCloudinaryUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });

  async function upload(files: File[] | FileList): Promise<MediaItem[]> {
    const list = Array.from(files);
    if (list.length === 0) return [];
    list.forEach(preflight);
    setUploading(true);
    setProgress({ current: 0, total: list.length });
    try {
      const items: MediaItem[] = [];
      for (const file of list) {
        const item = await uploadOne(file);
        items.push(item);
        setProgress((p) => ({ current: p.current + 1, total: p.total }));
      }
      return items;
    } finally {
      setUploading(false);
      setProgress({ current: 0, total: 0 });
    }
  }

  return { upload, uploading, progress };
}
