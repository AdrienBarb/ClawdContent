"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { XIcon, ImageIcon, FilmStripIcon, CircleNotchIcon } from "@phosphor-icons/react";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const UPLOAD_PRESET = "postclaw_unsigned";
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

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

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

  processNextRef.current = () => {
    const file = queueRef.current.shift();
    if (!file) {
      resetState();
      onClose();
      return;
    }

    setCurrentFileIndex((prev) => prev + 1);
    setProgress({ percent: 0, startedAt: Date.now() });

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

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
        const data = JSON.parse(xhr.responseText);
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
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`
    );
    xhr.send(formData);
  };

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

  if (!open) return null;

  const remainingSeconds =
    progress && progress.percent > 0
      ? Math.round(
          ((Date.now() - progress.startedAt) / progress.percent) *
            (100 - progress.percent) /
            1000
        )
      : null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h2 className="text-lg font-semibold text-gray-900">Upload</h2>
          <button
            type="button"
            onClick={handleClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <XIcon className="h-5 w-5" weight="bold" />
          </button>
        </div>

        {/* Drop zone */}
        <div className="px-6 pb-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-10 px-4 transition-colors cursor-pointer ${
              dragOver
                ? "border-primary bg-primary/5"
                : "border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100/50"
            } ${uploading ? "pointer-events-none opacity-60" : ""}`}
          >
            <div className="h-12 w-12 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
              <ImageIcon className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-600">
              Drop your file(s) here or{" "}
              <span className="text-primary font-medium">browse</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">Max: 25 MB images, 200 MB videos</p>
          </div>

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
          <div className="px-6 pb-4">
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
                    Uploading{totalFiles > 1 ? ` (${currentFileIndex}/${totalFiles})` : ""}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {progress.percent} %
                    {remainingSeconds !== null &&
                      remainingSeconds > 0 &&
                      ` · ${remainingSeconds} second${remainingSeconds !== 1 ? "s" : ""} remaining`}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="h-7 w-7 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Cancel upload"
                  >
                    <XIcon className="h-4 w-4" weight="bold" />
                  </button>
                </div>
              </div>
              <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
