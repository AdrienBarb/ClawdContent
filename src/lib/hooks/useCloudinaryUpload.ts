"use client";

import { useState } from "react";
import type { MediaItem } from "@/lib/schemas/mediaItems";
import { appRouter } from "@/lib/constants/appRouter";

interface CloudinaryResponse {
  secure_url: string;
  resource_type: "image" | "video" | "raw";
}

interface SignResponse {
  signature: string;
  timestamp: number;
  folder: string;
  allowedFormats: string;
  maxBytes: number;
  apiKey: string;
  cloudName: string;
  resourceType: "image" | "video";
}

function fileResourceType(file: File): "image" | "video" {
  if (file.type.startsWith("video/")) return "video";
  return "image";
}

function preflight(file: File, maxBytesByKind: Record<string, number>): void {
  const kind = fileResourceType(file);
  const max = maxBytesByKind[kind];
  if (file.size > max) {
    const mb = Math.round(max / 1024 / 1024);
    throw new Error(`${file.name} is too large (max ${mb} MB).`);
  }
  if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
    throw new Error(`${file.name} isn't a supported photo or video.`);
  }
}

// Local fast-fail check before we burn a signature request.
const CLIENT_MAX_BYTES = {
  image: 25 * 1024 * 1024,
  video: 200 * 1024 * 1024,
};

async function getSignature(
  resourceType: "image" | "video"
): Promise<SignResponse> {
  const res = await fetch(appRouter.api.uploadsSign, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resourceType }),
  });
  if (!res.ok) {
    throw new Error(`Could not get upload signature (${res.status})`);
  }
  return (await res.json()) as SignResponse;
}

async function uploadOne(file: File): Promise<MediaItem> {
  preflight(file, CLIENT_MAX_BYTES);
  const sign = await getSignature(fileResourceType(file));

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", sign.apiKey);
  formData.append("timestamp", String(sign.timestamp));
  formData.append("signature", sign.signature);
  formData.append("folder", sign.folder);
  formData.append("allowed_formats", sign.allowedFormats);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${sign.cloudName}/${sign.resourceType}/upload`,
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
    throw new Error(
      `Unsupported Cloudinary resource_type: ${data.resource_type}`
    );
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
    list.forEach((f) => preflight(f, CLIENT_MAX_BYTES));
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
