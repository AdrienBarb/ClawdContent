"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { ImageIcon, XIcon } from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const MAX_IMAGE_SIZE = 25 * 1024 * 1024; // 25 MB
const MAX_VIDEO_SIZE = 200 * 1024 * 1024; // 200 MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/quicktime",
];

export interface UploadResult {
  url: string;
  resourceType: "image" | "video";
  format: string;
  cloudinaryId: string;
  bytes: number;
  width?: number;
  height?: number;
  thumbnailUrl: string;
}

interface MediaUploadModalProps {
  open: boolean;
  onClose: () => void;
  onUploadComplete: (result: UploadResult) => void;
}

interface UploadProgress {
  percent: number;
  startedAt: number;
}

export default function MediaUploadModal({
  open,
  onClose,
  onUploadComplete,
}: MediaUploadModalProps) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [uploading, setUploading] = useState(false);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const queueRef = useRef<File[]>([]);

  // Escape, focus trap, focus restoration are all handled by the Dialog
  // primitive — no custom listener needed.

  // Cleanup XHR on unmount
  useEffect(() => {
    return () => {
      xhrRef.current?.abort();
    };
  }, []);

  const resetState = useCallback(() => {
    setError(null);
    setProgress(null);
    setUploading(false);
    setCurrentFileIndex(0);
    setTotalFiles(0);
    queueRef.current = [];
  }, []);

  const handleClose = useCallback(() => {
    if (uploading) {
      xhrRef.current?.abort();
    }
    resetState();
    onClose();
  }, [uploading, onClose, resetState]);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Unsupported file type. Use JPG, PNG, GIF, WebP, MP4, or MOV.";
    }
    const isVideo = file.type.startsWith("video/");
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    if (file.size > maxSize) {
      return `File too large. Max size is ${isVideo ? "200" : "25"} MB.`;
    }
    return null;
  };

  const processNextRef = useRef<() => void>(() => {});

  useEffect(() => {
    processNextRef.current = async () => {
    const file = queueRef.current.shift();
    if (!file) {
      resetState();
      onClose();
      return;
    }

    setCurrentFileIndex((prev) => prev + 1);
    setProgress({ percent: 0, startedAt: Date.now() });

    // Fetch a short-lived signature from our server before talking to
    // Cloudinary. The unsigned preset has been retired (cost-burn risk).
    const resourceType = file.type.startsWith("video/") ? "video" : "image";
    let sign: {
      signature: string;
      timestamp: number;
      folder: string;
      allowedFormats: string;
      maxBytes: number;
      apiKey: string;
      cloudName: string;
      resourceType: "image" | "video";
    };
    try {
      const signRes = await fetch("/api/uploads/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceType }),
      });
      if (!signRes.ok) throw new Error(`sign ${signRes.status}`);
      sign = await signRes.json();
    } catch {
      setError("Upload failed. Please try again.");
      setUploading(false);
      setProgress(null);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", sign.apiKey);
    formData.append("timestamp", String(sign.timestamp));
    formData.append("signature", sign.signature);
    formData.append("folder", sign.folder);
    formData.append("allowed_formats", sign.allowedFormats);

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        setProgress((prev) => ({
          percent: Math.round((e.loaded / e.total) * 100),
          startedAt: prev?.startedAt ?? Date.now(),
        }));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        let data: {
          resource_type?: string;
          secure_url?: string;
          format?: string;
          public_id?: string;
          bytes?: number;
          width?: number;
          height?: number;
          thumbnail_url?: string;
        };
        try {
          data = JSON.parse(xhr.responseText);
        } catch {
          setError("Upload failed. Please try again.");
          setUploading(false);
          setProgress(null);
          return;
        }
        if (!data.secure_url || !data.public_id || !data.format || data.bytes == null) {
          setError("Upload failed. Please try again.");
          setUploading(false);
          setProgress(null);
          return;
        }
        const resourceType =
          data.resource_type === "video" ? "video" : "image";

        const result: UploadResult = {
          url: data.secure_url,
          resourceType,
          format: data.format,
          cloudinaryId: data.public_id,
          bytes: data.bytes,
          width: data.width || undefined,
          height: data.height || undefined,
          thumbnailUrl: data.thumbnail_url || data.secure_url,
        };

        onUploadComplete(result);

        // Upload next file in queue or close
        if (queueRef.current.length > 0) {
          processNextRef.current();
        } else {
          resetState();
          onClose();
        }
      } else {
        setError("Upload failed. Please try again.");
        setUploading(false);
        setProgress(null);
      }
    });

    xhr.addEventListener("error", () => {
      setError("Upload failed. Check your connection and try again.");
      setUploading(false);
      setProgress(null);
    });

    xhr.addEventListener("abort", () => {
      setUploading(false);
      setProgress(null);
    });

    xhr.open(
      "POST",
      `https://api.cloudinary.com/v1_1/${sign.cloudName}/${sign.resourceType}/upload`
    );
    xhr.send(formData);
    };
  }, [onClose, onUploadComplete, resetState]);

  const uploadFiles = useCallback(
    (files: File[]) => {
      // Validate all files first
      for (const file of files) {
        const validationError = validateFile(file);
        if (validationError) {
          setError(validationError);
          return;
        }
      }

      setError(null);
      setUploading(true);
      setCurrentFileIndex(0);
      setTotalFiles(files.length);
      queueRef.current = [...files];
      processNextRef.current();
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) uploadFiles(files);
    },
    [uploadFiles]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length > 0) uploadFiles(files);
      // Reset so the same files can be selected again
      e.target.value = "";
    },
    [uploadFiles]
  );

  const handleCancel = useCallback(() => {
    queueRef.current = [];
    xhrRef.current?.abort();
    xhrRef.current = null;
  }, []);

  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  useEffect(() => {
    if (!progress || progress.percent <= 0) return;
    const { startedAt, percent } = progress;
    const id = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setRemainingSeconds(
        Math.round(((elapsed / percent) * (100 - percent)) / 1000)
      );
    }, 500);
    return () => window.clearInterval(id);
  }, [progress]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
      }}
    >
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <div className="px-6 pt-5 pb-3">
          <DialogTitle className="text-lg font-semibold text-gray-900">
            Upload
          </DialogTitle>
          <DialogDescription className="sr-only">
            Pick image or video files from your device, or drop them onto the
            zone below.
          </DialogDescription>
        </div>

        {/* Drop zone — real <button> so keyboard users can open the picker */}
        <div className="px-6 pb-4">
          <button
            type="button"
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
            disabled={uploading}
            aria-label="Browse files to upload"
            className={`relative flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed py-10 px-4 transition-colors cursor-pointer ${
              dragOver
                ? "border-primary bg-primary/5"
                : "border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100/50"
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <div className="h-12 w-12 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
              <ImageIcon className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-600">
              Drop your file(s) here or{" "}
              <span className="text-primary font-medium">browse</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Max: 25 MB images, 200 MB videos
            </p>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_TYPES.join(",")}
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="px-6 pb-4" role="alert">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Progress */}
        {uploading && progress && (
          <div className="px-6 pb-5">
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Uploading
                    {totalFiles > 1
                      ? ` (${currentFileIndex}/${totalFiles})`
                      : ""}
                  </p>
                  <p
                    className="text-xs text-gray-500 mt-0.5"
                    aria-live="polite"
                  >
                    {progress.percent} %
                    {progress &&
                      remainingSeconds !== null &&
                      remainingSeconds > 0 &&
                      ` · ${remainingSeconds} second${remainingSeconds !== 1 ? "s" : ""} remaining`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCancel}
                  aria-label="Cancel upload"
                  className="flex h-11 w-11 md:h-9 md:w-9 items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <XIcon className="h-4 w-4" weight="bold" />
                </button>
              </div>
              <div
                className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden"
                role="progressbar"
                aria-valuenow={progress.percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Upload progress"
              >
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
