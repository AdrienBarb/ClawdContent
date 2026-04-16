"use client";

import { useState } from "react";
import Link from "next/link";
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
import {
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Loader2,
  FileText,
  Share2,
  EyeOff,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import toast from "react-hot-toast";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Post {
  id: string;
  content: string;
  platforms: string[];
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
}

type StatusFilter = "scheduled" | "published" | "failed" | undefined;

interface PostCounts {
  all: number;
  scheduled: number;
  published: number;
  failed: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_TABS: {
  value: StatusFilter;
  label: string;
  countKey: keyof PostCounts;
}[] = [
  { value: undefined, label: "All", countKey: "all" },
  { value: "scheduled", label: "Scheduled", countKey: "scheduled" },
  { value: "published", label: "Published", countKey: "published" },
  { value: "failed", label: "Failed", countKey: "failed" },
];

const MAX_PREVIEW_LENGTH = 280;

const UNSUPPORTED_UNPUBLISH_PLATFORMS = ["instagram", "tiktok", "snapchat"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStatusBorder(status: string) {
  switch (status) {
    case "scheduled":
      return "border-l-blue-400";
    case "published":
      return "border-l-emerald-400";
    case "failed":
      return "border-l-red-400";
    default:
      return "border-l-gray-200";
  }
}

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

function formatTime(dateStr: string | null) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateHeader(dateKey: string) {
  const date = new Date(dateKey);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function groupByDate(posts: Post[]): [string, Post[]][] {
  const sorted = [...posts].sort((a, b) => {
    const dateA = new Date(
      a.scheduledAt ?? a.publishedAt ?? a.createdAt
    ).getTime();
    const dateB = new Date(
      b.scheduledAt ?? b.publishedAt ?? b.createdAt
    ).getTime();
    return dateB - dateA;
  });

  const groups = new Map<string, Post[]>();
  for (const post of sorted) {
    const rawDate = post.scheduledAt ?? post.publishedAt ?? post.createdAt;
    const dateKey = new Date(rawDate).toDateString();
    if (!groups.has(dateKey)) groups.set(dateKey, []);
    groups.get(dateKey)!.push(post);
  }

  return Array.from(groups.entries());
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ContentList() {
  const { useGet, usePost } = useApi();

  // Filters & UI state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(undefined);
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());

  // Inline editing
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  // Dialogs
  const [deleteTarget, setDeleteTarget] = useState<Post | null>(null);
  const [unpublishTarget, setUnpublishTarget] = useState<Post | null>(null);

  // ---------- Data ----------

  const { data, isLoading, refetch } = useGet(
    appRouter.api.posts,
    undefined,
    { refetchInterval: 10000 }
  );

  // ---------- Mutations ----------

  const deleteMutation = usePost(appRouter.api.postsDelete, {
    onSuccess: () => {
      toast.success("Post deleted");
      setDeleteTarget(null);
      refetch();
    },
    onError: () => toast.error("Failed to delete post"),
  });

  const retryMutation = usePost(appRouter.api.postsRetry, {
    onSuccess: () => {
      toast.success("Retrying post...");
      refetch();
    },
    onError: () => toast.error("Failed to retry post"),
  });

  const updateMutation = usePost(appRouter.api.postsUpdate, {
    onSuccess: () => {
      toast.success("Post updated");
      setEditingPostId(null);
      refetch();
    },
    onError: () => toast.error("Failed to update post"),
  });

  const unpublishMutation = usePost(appRouter.api.postsUnpublish, {
    onSuccess: () => {
      toast.success("Post unpublished");
      setUnpublishTarget(null);
      refetch();
    },
    onError: () => toast.error("Failed to unpublish post"),
  });

  // ---------- Derived ----------

  const allPosts: Post[] = data?.posts ?? [];
  const filteredPosts = statusFilter
    ? allPosts.filter((p) => p.status === statusFilter)
    : allPosts;

  const counts: PostCounts = {
    all: allPosts.length,
    scheduled: allPosts.filter((p) => p.status === "scheduled").length,
    published: allPosts.filter((p) => p.status === "published").length,
    failed: allPosts.filter((p) => p.status === "failed").length,
  };

  const grouped = groupByDate(filteredPosts);

  // ---------- Handlers ----------

  function startEditing(post: Post) {
    setEditingPostId(post.id);
    setEditContent(post.content);
  }

  function cancelEditing() {
    setEditingPostId(null);
    setEditContent("");
  }

  function handleSave(postId: string) {
    updateMutation.mutate({ postId, content: editContent });
  }

  function toggleExpanded(postId: string) {
    setExpandedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  }

  // ---------- Loading ----------

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
        <Skeleton className="h-10 w-80 rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      </div>
    );
  }

  // ---------- Render ----------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Content
        </h1>
        <Link
          href={appRouter.dashboard}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--sidebar-accent)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Create post
        </Link>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1.5 rounded-xl bg-gray-100 p-1 w-fit overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.label}
            onClick={() => setStatusFilter(tab.value)}
            className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === tab.value
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
            {counts[tab.countKey] > 0 && (
              <span className="ml-1.5 text-xs tabular-nums opacity-60">
                {counts[tab.countKey]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Posts grouped by date */}
      {grouped.length > 0 ? (
        <div className="space-y-8">
          {grouped.map(([dateKey, posts]) => (
            <div key={dateKey} className="space-y-3">
              {/* Date header */}
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-gray-500 whitespace-nowrap">
                  {formatDateHeader(dateKey)}
                </h3>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* Post cards */}
              <div className="space-y-3">
                {posts.map((post) => {
                  const isEditing = editingPostId === post.id;
                  const isLong = post.content.length > MAX_PREVIEW_LENGTH;
                  const isExpanded = expandedPosts.has(post.id);
                  const displayContent =
                    isLong && !isExpanded
                      ? post.content.slice(0, MAX_PREVIEW_LENGTH) + "..."
                      : post.content;

                  return (
                    <div
                      key={post.id}
                      className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden"
                    >
                      <div
                        className={`border-l-4 p-5 ${getStatusBorder(post.status)}`}
                      >
                        {/* Top: time + status */}
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs text-gray-400">
                            {formatTime(
                              post.scheduledAt ??
                                post.publishedAt ??
                                post.createdAt
                            )}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getStatusStyle(post.status)}`}
                          >
                            {post.status}
                          </span>
                        </div>

                        {/* Content */}
                        {isEditing ? (
                          <div className="space-y-3">
                            <textarea
                              className="w-full resize-none rounded-xl border border-gray-200 p-3 text-sm text-gray-900 leading-relaxed focus:outline-none focus:ring-2 focus:ring-[var(--sidebar-accent)]/20 focus:border-[var(--sidebar-accent)] transition-all"
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              rows={Math.max(
                                3,
                                editContent.split("\n").length + 1
                              )}
                              autoFocus
                            />
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={cancelEditing}
                                disabled={updateMutation.isPending}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleSave(post.id)}
                                disabled={
                                  updateMutation.isPending ||
                                  editContent === post.content
                                }
                                className="bg-[var(--sidebar-accent)] hover:opacity-90 text-white"
                              >
                                {updateMutation.isPending && (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                                )}
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-line">
                              {displayContent}
                            </p>
                            {isLong && (
                              <button
                                onClick={() => toggleExpanded(post.id)}
                                className="mt-1 inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                              >
                                {isExpanded ? (
                                  <>
                                    Show less{" "}
                                    <ChevronUp className="h-3 w-3" />
                                  </>
                                ) : (
                                  <>
                                    Show more{" "}
                                    <ChevronDown className="h-3 w-3" />
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        )}

                        {/* Bottom: platforms + actions */}
                        {!isEditing && (
                          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
                            {/* Platform badges */}
                            <div className="flex items-center gap-1.5">
                              {post.platforms.map((platformId) => {
                                const platform = getPlatform(platformId);
                                return (
                                  <span
                                    key={platformId}
                                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white"
                                    style={{
                                      backgroundColor:
                                        platform?.color ?? "#6b7280",
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

                            {/* Actions */}
                            <div className="flex items-center gap-1.5">
                              {/* Scheduled: Edit + Delete */}
                              {post.status === "scheduled" && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs cursor-pointer"
                                    onClick={() => startEditing(post)}
                                  >
                                    <Pencil className="h-3.5 w-3.5 mr-1" />
                                    Edit
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 cursor-pointer"
                                    onClick={() => setDeleteTarget(post)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}

                              {/* Failed: Retry + Edit + Delete */}
                              {post.status === "failed" && (
                                <>
                                  <Button
                                    size="sm"
                                    className="h-8 text-xs bg-[var(--sidebar-accent)] hover:opacity-90 text-white cursor-pointer"
                                    onClick={() =>
                                      retryMutation.mutate({
                                        postId: post.id,
                                      })
                                    }
                                    disabled={retryMutation.isPending}
                                  >
                                    {retryMutation.isPending ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                                    ) : (
                                      <RefreshCw className="h-3.5 w-3.5 mr-1" />
                                    )}
                                    Retry
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs cursor-pointer"
                                    onClick={() => startEditing(post)}
                                  >
                                    <Pencil className="h-3.5 w-3.5 mr-1" />
                                    Edit
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 cursor-pointer"
                                    onClick={() => setDeleteTarget(post)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}

                              {/* Published: Unpublish */}
                              {post.status === "published" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
                                  onClick={() => setUnpublishTarget(post)}
                                >
                                  <EyeOff className="h-3.5 w-3.5 mr-1" />
                                  Unpublish
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty state */
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white/50 p-12 text-center">
          <FileText className="h-10 w-10 text-gray-300 mx-auto mb-4" />
          <p className="text-sm font-medium text-gray-500 mb-1">
            {statusFilter ? `No ${statusFilter} posts` : "No posts yet"}
          </p>
          <p className="text-xs text-gray-400 mb-5">
            {statusFilter
              ? "Try a different filter or create new content."
              : "Start chatting with your AI social media manager to create content."}
          </p>
          <Link
            href={appRouter.dashboard}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--sidebar-accent)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Create post
          </Link>
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
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                deleteTarget &&
                deleteMutation.mutate({ postId: deleteTarget.id })
              }
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
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

      {/* Unpublish platform picker dialog */}
      <Dialog
        open={unpublishTarget !== null}
        onOpenChange={(open) => {
          if (!open) setUnpublishTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unpublish post</DialogTitle>
            <DialogDescription>
              Choose which platform to remove this post from. The post will be
              marked as cancelled in PostClaw.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            {unpublishTarget?.platforms.map((platformId) => {
              const platform = getPlatform(platformId);
              const unsupported =
                UNSUPPORTED_UNPUBLISH_PLATFORMS.includes(platformId);
              return (
                <button
                  key={platformId}
                  disabled={unsupported || unpublishMutation.isPending}
                  onClick={() =>
                    unpublishTarget &&
                    unpublishMutation.mutate({
                      postId: unpublishTarget.id,
                      platform: platformId,
                    })
                  }
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors border ${
                    unsupported
                      ? "border-gray-100 text-gray-300 cursor-not-allowed"
                      : "border-gray-200 text-gray-700 hover:border-red-200 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                  }`}
                >
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white"
                    style={{
                      backgroundColor: unsupported
                        ? "#d1d5db"
                        : (platform?.color ?? "#6b7280"),
                    }}
                  >
                    {platform?.icon ?? <Share2 className="h-3.5 w-3.5" />}
                  </span>
                  {platform?.label ?? platformId}
                  {unsupported && (
                    <span className="ml-auto text-xs text-gray-400">
                      Not supported
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUnpublishTarget(null)}
              disabled={unpublishMutation.isPending}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
