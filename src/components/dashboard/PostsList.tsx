"use client";

import { useState } from "react";
import { appRouter } from "@/lib/constants/appRouter";
import { getPlatform } from "@/lib/constants/platforms";
import useApi from "@/lib/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, Trash2, Loader2, Share2 } from "lucide-react";
import toast from "react-hot-toast";

interface Post {
  id: string;
  content: string;
  platforms: string[];
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
}

const STATUS_TABS = [
  { value: undefined, label: "All" },
  { value: "scheduled", label: "Scheduled" },
  { value: "published", label: "Published" },
  { value: "failed", label: "Failed" },
] as const;

function getStatusStyle(status: string) {
  switch (status) {
    case "published":
      return "bg-emerald-50 text-emerald-700";
    case "scheduled":
      return "bg-blue-50 text-blue-700";
    case "failed":
      return "bg-red-50 text-red-700";
    default:
      return "bg-gray-50 text-gray-600";
  }
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function PostsList() {
  const { useGet, usePost } = useApi();
  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    undefined
  );
  const [deleteTarget, setDeleteTarget] = useState<Post | null>(null);

  const {
    data,
    isLoading,
    refetch,
  } = useGet(
    appRouter.api.posts,
    statusFilter ? { status: statusFilter } : undefined,
    { refetchInterval: 10000 }
  );

  const { mutate: deletePost, isPending: isDeleting } = usePost(
    appRouter.api.postsDelete,
    {
      onSuccess: () => {
        toast.success("Post deleted");
        setDeleteTarget(null);
        refetch();
      },
      onError: () => {
        toast.error("Failed to delete post. Please try again.");
      },
    }
  );

  const posts: Post[] = data?.posts ?? [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status filter tabs */}
      <div className="flex gap-1.5 rounded-xl bg-gray-100 p-1 w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.label}
            onClick={() => setStatusFilter(tab.value)}
            className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all cursor-pointer ${
              statusFilter === tab.value
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Posts list */}
      {posts.length > 0 ? (
        <div className="space-y-3">
          {posts.map((post) => (
            <div
              key={post.id}
              className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Content preview */}
                  <p className="text-sm text-gray-900 leading-relaxed">
                    {post.content.length > 120
                      ? `${post.content.slice(0, 120)}...`
                      : post.content}
                  </p>

                  {/* Meta row */}
                  <div className="flex items-center gap-3 mt-3">
                    {/* Platform icons */}
                    <div className="flex items-center gap-1.5">
                      {post.platforms.map((platformId) => {
                        const platform = getPlatform(platformId);
                        return (
                          <span
                            key={platformId}
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white"
                            style={{
                              backgroundColor: platform?.color ?? "#6b7280",
                            }}
                            title={platform?.label ?? platformId}
                          >
                            {platform?.icon ?? (
                              <Share2 className="h-3 w-3" />
                            )}
                          </span>
                        );
                      })}
                    </div>

                    {/* Status badge */}
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getStatusStyle(post.status)}`}
                    >
                      {post.status}
                    </span>

                    {/* Timestamp */}
                    <span className="text-xs text-gray-400">
                      {formatDate(
                        post.publishedAt ?? post.scheduledAt ?? post.createdAt
                      )}
                    </span>
                  </div>
                </div>

                {/* Delete button */}
                <button
                  onClick={() => setDeleteTarget(post)}
                  className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                  title="Delete post"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white/50 p-10 text-center">
          <FileText className="h-8 w-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500 mb-1">
            No posts yet
          </p>
          <p className="text-xs text-gray-400">
            Posts created through your AI assistant will appear here.
          </p>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete post</DialogTitle>
            <DialogDescription>
              {deleteTarget?.status === "published"
                ? "This will remove the post from PostClaw tracking. Content already live on social platforms won't be affected."
                : "This will permanently delete this post. This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                deleteTarget && deletePost({ postId: deleteTarget.id })
              }
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
