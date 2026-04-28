"use client";

import { useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { appRouter } from "@/lib/constants/appRouter";
import useApi from "@/lib/hooks/useApi";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PlusIcon,
  CopyIcon,
  TrashIcon,
  CircleNotchIcon,
  FilmStripIcon,
  ImageIcon,
  CloudArrowUpIcon,
  MagicWandIcon,
  FolderOpenIcon,
} from "@phosphor-icons/react";
import type { UploadResult } from "@/components/dashboard/MediaUploadModal";
import PageHeader from "@/components/dashboard/PageHeader";
import toast from "react-hot-toast";

// Modals are only mounted on user click — defer their JS until needed.
const MediaUploadModal = dynamic(
  () => import("@/components/dashboard/MediaUploadModal"),
  { ssr: false }
);
const SubscribeModal = dynamic(
  () => import("@/components/dashboard/SubscribeModal"),
  { ssr: false }
);

interface Media {
  id: string;
  url: string;
  cloudinaryId: string;
  resourceType: string;
  format: string;
  bytes: number;
  width: number | null;
  height: number | null;
  createdAt: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const FAKE_MEDIA = [
  { format: "JPG", bytes: "2.4 MB", dims: "1920×1080", type: "image" },
  { format: "PNG", bytes: "1.1 MB", dims: "1080×1080", type: "image" },
  { format: "MP4", bytes: "18.5 MB", dims: "1920×1080", type: "video" },
  { format: "JPG", bytes: "890 KB", dims: "1200×628", type: "image" },
  { format: "PNG", bytes: "3.2 MB", dims: "1080×1350", type: "image" },
  { format: "WEBP", bytes: "540 KB", dims: "800×800", type: "image" },
  { format: "MP4", bytes: "24.1 MB", dims: "1080×1920", type: "video" },
  { format: "JPG", bytes: "1.8 MB", dims: "1200×675", type: "image" },
];

export default function MediaPage() {
  const { useGet, usePost } = useApi();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);

  const { data: dashboardStatus } = useGet(appRouter.api.dashboardStatus);
  const subStatus = (
    dashboardStatus as
      | { subscription?: { status: string } }
      | undefined
  )?.subscription?.status;
  const hasActiveSubscription =
    subStatus === "active" || subStatus === "trialing" || subStatus === "past_due";
  const showGlassPreview = !hasActiveSubscription;

  const {
    data: mediaList,
    isLoading,
    refetch,
  } = useGet(appRouter.api.media) as {
    data: Media[] | undefined;
    isLoading: boolean;
    refetch: () => void;
  };

  const { mutate: deleteMedia } = usePost(appRouter.api.mediaDelete, {
    onSuccess: () => {
      setDeletingId(null);
      refetch();
      toast.success("Media deleted");
    },
    onError: () => {
      setDeletingId(null);
      toast.error("Failed to delete media");
    },
  });

  const handleUploadComplete = (result: UploadResult) => {
    fetch(appRouter.api.mediaUpload, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cloudinaryId: result.cloudinaryId,
        url: result.url,
        resourceType: result.resourceType,
        format: result.format,
        bytes: result.bytes,
        width: result.width,
        height: result.height,
      }),
    }).then(() => refetch());
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("URL copied to clipboard");
  };

  const handleDelete = (mediaId: string) => {
    setDeletingId(mediaId);
    deleteMedia({ mediaId });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const media = mediaList ?? [];

  return (
    <div className={showGlassPreview ? "relative min-h-[calc(100vh-8rem)]" : "space-y-8"}>
      <PageHeader
        title="Media"
        subtitle="Manage your uploaded images and videos."
        right={
          !showGlassPreview ? (
            <button
              onClick={() => setUploadOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-[var(--sidebar-accent)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90 cursor-pointer"
            >
              <PlusIcon className="h-4 w-4" />
              Upload
            </button>
          ) : undefined
        }
      />

      {showGlassPreview ? (
        <div className="absolute inset-0 mt-24">
          {/* Blurred fake data */}
          <div
            className="blur-[1.5px] pointer-events-none select-none px-6 max-w-5xl mx-auto"
            style={{
              maskImage:
                "radial-gradient(ellipse 70% 60% at 50% 40%, black 30%, transparent 80%)",
              WebkitMaskImage:
                "radial-gradient(ellipse 70% 60% at 50% 40%, black 30%, transparent 80%)",
            }}
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {FAKE_MEDIA.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden"
                >
                  <div className="aspect-square bg-gray-100 flex items-center justify-center">
                    {item.type === "image" ? (
                      <ImageIcon className="h-10 w-10 text-gray-300" />
                    ) : (
                      <FilmStripIcon className="h-10 w-10 text-gray-300" />
                    )}
                  </div>
                  <div className="px-3 py-2.5 border-t border-gray-50">
                    <p className="text-xs text-gray-500">
                      {item.format} &middot; {item.bytes} &middot; {item.dims}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Overlay CTA */}
          <div className="fixed inset-0 z-10 flex items-center justify-center pointer-events-none md:pl-64">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200/60 px-8 py-8 max-w-md w-full text-center pointer-events-auto">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--sidebar-accent)] mb-3">
                Media library
              </p>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                All your visuals in one place
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-5">
                Upload images and videos, then reuse them across all your posts.
              </p>

              <div className="flex flex-col gap-2.5 mb-6 text-left">
                <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--sidebar-accent)]/10 text-[var(--sidebar-accent)]">
                    <CloudArrowUpIcon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Upload images & videos</p>
                    <p className="text-xs text-gray-500">Drag and drop or browse — up to 200 MB</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--sidebar-accent)]/10 text-[var(--sidebar-accent)]">
                    <MagicWandIcon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Picks the right visuals</p>
                    <p className="text-xs text-gray-500">We browse and attach your media for you</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--sidebar-accent)]/10 text-[var(--sidebar-accent)]">
                    <FolderOpenIcon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Reuse across platforms</p>
                    <p className="text-xs text-gray-500">One upload, share everywhere — no re-uploading</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowSubscribeModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--sidebar-accent)] px-6 py-3 text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-lg w-full justify-center cursor-pointer"
              >
                Get started
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ) : media.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-12 shadow-sm text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
            <ImageIcon className="h-6 w-6 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-900">No media yet</p>
          <p className="text-sm text-gray-500 mt-1">
            Upload images or videos to use in your posts.
          </p>
          <button
            onClick={() => setUploadOpen(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 cursor-pointer"
          >
            <PlusIcon className="h-4 w-4" />
            Upload media
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {media.map((item) => {
            const isDeleting = deletingId === item.id;
            const isImage = item.resourceType === "image";

            return (
              <div
                key={item.id}
                className="group relative rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden"
              >
                {/* Preview */}
                <div className="aspect-square bg-gray-50 flex items-center justify-center overflow-hidden relative">
                  {isImage ? (
                    <Image
                      src={item.url}
                      alt=""
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <FilmStripIcon className="h-8 w-8" />
                      <span className="text-xs font-medium uppercase">
                        {item.format}
                      </span>
                    </div>
                  )}
                </div>

                {/* Info bar */}
                <div className="px-3 py-2.5 border-t border-gray-50">
                  <p className="text-xs text-gray-500 truncate">
                    {item.format.toUpperCase()} &middot; {formatBytes(item.bytes)}
                    {item.width && item.height
                      ? ` \u00b7 ${item.width}\u00d7${item.height}`
                      : ""}
                  </p>
                </div>

                {/* Hover actions */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => handleCopyUrl(item.url)}
                    className="h-9 w-9 rounded-full bg-white/90 flex items-center justify-center text-gray-700 hover:bg-white transition-colors cursor-pointer"
                    title="Copy URL"
                  >
                    <CopyIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    disabled={isDeleting}
                    className="h-9 w-9 rounded-full bg-white/90 flex items-center justify-center text-red-500 hover:bg-white transition-colors disabled:opacity-50 cursor-pointer"
                    title="Delete"
                  >
                    {isDeleting ? (
                      <CircleNotchIcon className="h-4 w-4 animate-spin" />
                    ) : (
                      <TrashIcon className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <MediaUploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploadComplete={handleUploadComplete}
      />

      <SubscribeModal
        open={showSubscribeModal}
        onOpenChange={setShowSubscribeModal}
      />
    </div>
  );
}
