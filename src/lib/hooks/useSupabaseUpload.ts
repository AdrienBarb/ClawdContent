"use client";

import { useState } from "react";
import type { MediaItem } from "@/lib/schemas/mediaItems";
import { appRouter } from "@/lib/constants/appRouter";
import { getBrowserSupabase, MEDIA_BUCKET } from "@/lib/supabase/browser";
import { MEDIA_SIZE_LIMITS } from "@/lib/supabase/constants";

/** Rich result the media library needs (dimensions/bytes/path for the DB row). */
export interface UploadedMedia {
  url: string;
  storagePath: string;
  resourceType: "image" | "video";
  format: string;
  bytes: number;
  width?: number;
  height?: number;
}

interface SignResponse {
  bucket: string;
  path: string;
  token: string;
  publicUrl: string;
  resourceType: "image" | "video";
}

// Bad/corrupt files may fire neither onload nor onerror — cap the probe so it
// always settles and never wedges the upload loop.
const DIMENSION_TIMEOUT_MS = 5000;

function fileResourceType(file: File): "image" | "video" {
  return file.type.startsWith("video/") ? "video" : "image";
}

function fileExt(file: File): string {
  const dot = file.name.lastIndexOf(".");
  const ext =
    dot >= 0 ? file.name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  return ext || file.type.split("/")[1] || "bin";
}

function preflight(file: File): void {
  const kind = fileResourceType(file);
  const max = MEDIA_SIZE_LIMITS[kind];
  if (file.size > max) {
    const mb = Math.round(max / 1024 / 1024);
    throw new Error(`${file.name} is too large (max ${mb} MB).`);
  }
  if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
    throw new Error(`${file.name} isn't a supported photo or video.`);
  }
}

async function getSignature(file: File): Promise<SignResponse> {
  const res = await fetch(appRouter.api.uploadsSign, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      resourceType: fileResourceType(file),
      fileName: file.name,
    }),
  });
  if (!res.ok) {
    throw new Error(`Could not start upload (${res.status})`);
  }
  return (await res.json()) as SignResponse;
}

// Best-effort intrinsic dimensions (Supabase, unlike Cloudinary, doesn't return
// them). Resolves to {} on any failure — width/height are optional in the DB.
async function mediaDimensions(
  file: File
): Promise<{ width?: number; height?: number }> {
  if (typeof window === "undefined") return {};
  if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
    return {};
  }

  const objectUrl = URL.createObjectURL(file);
  const probe = new Promise<{ width?: number; height?: number }>((resolve) => {
    if (file.type.startsWith("image/")) {
      const img = new window.Image();
      img.onload = () =>
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({});
      img.src = objectUrl;
    } else {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () =>
        resolve({ width: video.videoWidth, height: video.videoHeight });
      video.onerror = () => resolve({});
      video.src = objectUrl;
    }
  });
  const timeout = new Promise<{ width?: number; height?: number }>((resolve) => {
    setTimeout(() => resolve({}), DIMENSION_TIMEOUT_MS);
  });

  try {
    return await Promise.race([probe, timeout]);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function uploadOne(file: File): Promise<UploadedMedia> {
  preflight(file);
  const sign = await getSignature(file);

  const supabase = getBrowserSupabase();
  const { error } = await supabase.storage
    .from(sign.bucket || MEDIA_BUCKET)
    .uploadToSignedUrl(sign.path, sign.token, file, {
      contentType: file.type || undefined,
    });
  if (error) {
    throw new Error(`Upload failed (${error.message})`);
  }

  const dims = await mediaDimensions(file);
  return {
    url: sign.publicUrl,
    storagePath: sign.path,
    resourceType: sign.resourceType,
    format: fileExt(file),
    bytes: file.size,
    width: dims.width,
    height: dims.height,
  };
}

export function useSupabaseUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });

  async function uploadDetailed(
    files: File[] | FileList
  ): Promise<UploadedMedia[]> {
    const list = Array.from(files);
    if (list.length === 0) return [];
    list.forEach(preflight);
    setUploading(true);
    setProgress({ current: 0, total: list.length });
    try {
      const items: UploadedMedia[] = [];
      for (const file of list) {
        items.push(await uploadOne(file));
        setProgress((p) => ({ current: p.current + 1, total: p.total }));
      }
      return items;
    } finally {
      setUploading(false);
      setProgress({ current: 0, total: 0 });
    }
  }

  async function upload(files: File[] | FileList): Promise<MediaItem[]> {
    const detailed = await uploadDetailed(files);
    return detailed.map((m) => ({ url: m.url, type: m.resourceType }));
  }

  return { upload, uploadDetailed, uploading, progress };
}
