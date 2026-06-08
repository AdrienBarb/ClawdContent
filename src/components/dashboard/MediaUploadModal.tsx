"use client";

import { useState, useRef, useCallback } from "react";
import { ImageIcon, XIcon } from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useSupabaseUpload } from "@/lib/hooks/useSupabaseUpload";
import { MEDIA_SIZE_LIMITS } from "@/lib/supabase/constants";

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
  storagePath: string;
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

export default function MediaUploadModal({
  open,
  onClose,
  onUploadComplete,
}: MediaUploadModalProps) {
  const { uploadDetailed } = useSupabaseUpload();
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [percent, setPercent] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelledRef = useRef(false);

  const resetState = useCallback(() => {
    setError(null);
    setPercent(0);
    setUploading(false);
    setCurrentFileIndex(0);
    setTotalFiles(0);
  }, []);

  const handleClose = useCallback(() => {
    cancelledRef.current = true;
    resetState();
    onClose();
  }, [onClose, resetState]);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Unsupported file type. Use JPG, PNG, GIF, WebP, MP4, or MOV.";
    }
    const isVideo = file.type.startsWith("video/");
    const maxSize = isVideo ? MEDIA_SIZE_LIMITS.video : MEDIA_SIZE_LIMITS.image;
    if (file.size > maxSize) {
      return `File too large. Max size is ${isVideo ? "200" : "25"} MB.`;
    }
    return null;
  };

  const uploadFiles = useCallback(
    async (files: File[]) => {
      for (const file of files) {
        const validationError = validateFile(file);
        if (validationError) {
          setError(validationError);
          return;
        }
      }

      setError(null);
      setUploading(true);
      setTotalFiles(files.length);
      setCurrentFileIndex(0);
      setPercent(0);
      cancelledRef.current = false;

      try {
        for (let i = 0; i < files.length; i++) {
          if (cancelledRef.current) return;
          setCurrentFileIndex(i + 1);
          setPercent(Math.round((i / files.length) * 100));

          const [uploaded] = await uploadDetailed([files[i]]);
          if (cancelledRef.current) return;
          if (!uploaded) continue;

          onUploadComplete({
            url: uploaded.url,
            resourceType: uploaded.resourceType,
            format: uploaded.format,
            storagePath: uploaded.storagePath,
            bytes: uploaded.bytes,
            width: uploaded.width,
            height: uploaded.height,
            thumbnailUrl: uploaded.url,
          });
          setPercent(Math.round(((i + 1) / files.length) * 100));
        }
      } catch {
        setError("Upload failed. Please try again.");
        setUploading(false);
        setPercent(0);
        return;
      }

      resetState();
      onClose();
    },
    [uploadDetailed, onUploadComplete, onClose, resetState]
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
    cancelledRef.current = true;
    resetState();
  }, [resetState]);

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
        {uploading && (
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
                  <p className="text-xs text-gray-500 mt-0.5" aria-live="polite">
                    {percent} %
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
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Upload progress"
              >
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
