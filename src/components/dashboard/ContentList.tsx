"use client";

import { useState } from "react";
import Link from "next/link";
import { appRouter } from "@/lib/constants/appRouter";
import { getPlatform } from "@/lib/constants/platforms";
import useApi, { fetchData } from "@/lib/hooks/useApi";
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
  Trash2,
  RefreshCw,
  Loader2,
  CalendarClock,
  Share2,
  EyeOff,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Link2,
  Pencil,
  ShieldAlert,
  Clock,
  ServerCrash,
  CheckCircle2,
  XCircle,
  FileEdit,
} from "lucide-react";
import toast from "react-hot-toast";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PostPlatform {
  platform: string;
  accountId?: string;
  status?: string;
  scheduledFor?: string | null;
  [key: string]: unknown;
}

interface PostMediaItem {
  url: string;
  type: string;
}

interface Post {
  id: string;
  content: string;
  platforms: PostPlatform[];
  mediaItems?: PostMediaItem[];
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
}

type StatusFilter = "draft" | "scheduled" | "published" | "failed";

interface PostErrorDetail {
  errorMessage: string | null;
  errorCategory: string | null;
  errorSource: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_TABS: {
  value: StatusFilter;
  label: string;
  icon: typeof CalendarClock;
}[] = [
  { value: "scheduled", label: "Queue", icon: CalendarClock },
  { value: "published", label: "Published", icon: CheckCircle2 },
  { value: "draft", label: "Drafts", icon: FileEdit },
  { value: "failed", label: "Failed", icon: XCircle },
];

const MAX_PREVIEW_LENGTH = 280;

const UNSUPPORTED_UNPUBLISH_PLATFORMS = ["instagram", "tiktok", "snapchat"];

const ERROR_HINTS: Record<string, { icon: typeof AlertCircle; hint: string }> =
  {
    auth_expired: {
      icon: Link2,
      hint: "Reconnect your account in Social Accounts.",
    },
    user_content: {
      icon: Pencil,
      hint: "Edit the content — it may be too long or in the wrong format.",
    },
    user_abuse: {
      icon: Clock,
      hint: "Rate limited. Wait a bit then retry.",
    },
    account_issue: {
      icon: ShieldAlert,
      hint: "Check your account settings on the platform.",
    },
    platform_rejected: {
      icon: ShieldAlert,
      hint: "The platform rejected this content. Edit and retry.",
    },
    platform_error: {
      icon: ServerCrash,
      hint: "Platform outage. Try again later.",
    },
    system_error: {
      icon: ServerCrash,
      hint: "Temporary system issue. Retry should work.",
    },
  };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(dateStr: string) {
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
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/** Returns the relevant date for a post depending on its status. */
function getPostDate(post: Post): string {
  if (post.status === "scheduled") return post.scheduledAt ?? post.createdAt;
  if (post.status === "published") return post.publishedAt ?? post.createdAt;
  return post.createdAt;
}

/**
 * Group posts by date.
 * Scheduled: ascending (soonest first — it's a queue).
 * Published/Failed: descending (most recent first).
 */
function groupByDate(
  posts: Post[],
  status: StatusFilter
): [string, Post[]][] {
  const asc = status === "scheduled";

  const sorted = [...posts].sort((a, b) => {
    const dateA = new Date(getPostDate(a)).getTime();
    const dateB = new Date(getPostDate(b)).getTime();
    return asc ? dateA - dateB : dateB - dateA;
  });

  const groups = new Map<string, Post[]>();
  for (const post of sorted) {
    const dateKey = new Date(getPostDate(post)).toDateString();
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

  // Default to "scheduled" — the queue view
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("scheduled");
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());

  // Reschedule
  const [reschedulingPostId, setReschedulingPostId] = useState<string | null>(
    null
  );
  const [rescheduleDate, setRescheduleDate] = useState("");

  // Dialogs
  const [deleteTarget, setDeleteTarget] = useState<Post | null>(null);

  // Error details (fetched on demand for failed posts)
  const [errorDetails, setErrorDetails] = useState<
    Record<string, PostErrorDetail>
  >({});
  const [loadingErrors, setLoadingErrors] = useState<Set<string>>(new Set());

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

  const rescheduleMutation = usePost(appRouter.api.postsUpdate, {
    onSuccess: () => {
      toast.success("Post rescheduled");
      setReschedulingPostId(null);
      refetch();
    },
    onError: () => toast.error("Failed to reschedule post"),
  });

  const unpublishMutation = usePost(appRouter.api.postsUnpublish, {
    onSuccess: () => {
      toast.success("Post unpublished");
      refetch();
    },
    onError: () => toast.error("Failed to unpublish post"),
  });

  // ---------- Derived ----------

  const allPosts: Post[] = data?.posts ?? [];
  const filteredPosts = allPosts.filter((p) => p.status === statusFilter);

  const counts = {
    draft: allPosts.filter((p) => p.status === "draft").length,
    scheduled: allPosts.filter((p) => p.status === "scheduled").length,
    published: allPosts.filter((p) => p.status === "published").length,
    failed: allPosts.filter((p) => p.status === "failed").length,
  };

  const grouped = groupByDate(filteredPosts, statusFilter);

  // ---------- Handlers ----------

  function startRescheduling(post: Post) {
    setReschedulingPostId(post.id);
    // Convert ISO string to datetime-local format (YYYY-MM-DDTHH:MM)
    if (post.scheduledAt) {
      const d = new Date(post.scheduledAt);
      const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
      setRescheduleDate(local.toISOString().slice(0, 16));
    } else {
      setRescheduleDate("");
    }
  }

  function handleReschedule(postId: string) {
    if (!rescheduleDate) return;
    rescheduleMutation.mutate({
      postId,
      scheduledAt: new Date(rescheduleDate).toISOString(),
    });
  }

  async function fetchErrorDetail(postId: string) {
    if (errorDetails[postId] || loadingErrors.has(postId)) return;
    setLoadingErrors((prev) => new Set(prev).add(postId));
    try {
      const res = await fetchData(
        `${appRouter.api.postsDetail}?postId=${postId}`
      );
      setErrorDetails((prev) => ({
        ...prev,
        [postId]: {
          errorMessage: res.post.errorMessage ?? null,
          errorCategory: res.post.errorCategory ?? null,
          errorSource: res.post.errorSource ?? null,
        },
      }));
    } catch {
      // Silently fail — the card still works without error details
    } finally {
      setLoadingErrors((prev) => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    }
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
        <div className="space-y-6 mt-6">
          <Skeleton className="h-5 w-48" />
          <div className="flex gap-4">
            <Skeleton className="h-6 w-16 shrink-0" />
            <Skeleton className="h-36 flex-1 rounded-2xl" />
          </div>
          <div className="flex gap-4">
            <Skeleton className="h-6 w-16 shrink-0" />
            <Skeleton className="h-36 flex-1 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  // ---------- Empty state per tab ----------

  const emptyMessages: Record<StatusFilter, { title: string; sub: string }> = {
    draft: {
      title: "No drafts",
      sub: "Drafts created in chat will appear here for you to schedule.",
    },
    scheduled: {
      title: "No scheduled posts",
      sub: "Chat with your AI social media manager to schedule content.",
    },
    published: {
      title: "No published posts yet",
      sub: "Posts will appear here once they go live.",
    },
    failed: {
      title: "No failed posts",
      sub: "That\u2019s a good thing!",
    },
  };

  // ---------- Render ----------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Posts
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
        {STATUS_TABS.map((tab) => {
          const Icon = tab.icon;
          const count = counts[tab.value];
          const active = statusFilter === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                active
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
              {count > 0 && (
                <span
                  className={`text-xs tabular-nums ${active ? "text-gray-400" : "opacity-60"}`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Timeline */}
      {grouped.length > 0 ? (
        <div className="space-y-8">
          {grouped.map(([dateKey, posts]) => (
            <div key={dateKey}>
              {/* Date header */}
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                  {formatDateHeader(dateKey)}
                </h3>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* Timeline entries */}
              <div className="space-y-4">
                {posts.map((post) => {
                  const isRescheduling = reschedulingPostId === post.id;
                  const isLong = post.content.length > MAX_PREVIEW_LENGTH;
                  const isExpanded = expandedPosts.has(post.id);
                  const displayContent =
                    isLong && !isExpanded
                      ? post.content.slice(0, MAX_PREVIEW_LENGTH) + "..."
                      : post.content;

                  const timeStr = formatTime(getPostDate(post));

                  return (
                    <div key={post.id} className="flex gap-4">
                      {/* Left: time column */}
                      <div className="w-20 shrink-0 pt-4 text-right">
                        <span className="text-sm font-semibold text-gray-900 tabular-nums">
                          {timeStr}
                        </span>
                      </div>

                      {/* Timeline dot + line */}
                      <div className="flex flex-col items-center shrink-0">
                        <div className="mt-5 h-2.5 w-2.5 rounded-full bg-[var(--sidebar-accent)]" />
                        <div className="flex-1 w-px bg-gray-200 mt-1" />
                      </div>

                      {/* Right: card */}
                      <div className="flex-1 min-w-0 pb-2">
                        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
                          {/* Platform icons */}
                          <div className="flex items-center gap-1.5 mb-3">
                            {post.platforms.map((p) => {
                              const platformId = p.platform;
                              const platform = getPlatform(platformId);
                              return (
                                <span
                                  key={platformId}
                                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white"
                                  style={{
                                    backgroundColor:
                                      platform?.color ?? "#6b7280",
                                  }}
                                  title={platform?.label ?? platformId}
                                >
                                  {platform?.icon ?? (
                                    <Share2 className="h-3.5 w-3.5" />
                                  )}
                                </span>
                              );
                            })}
                          </div>

                          {/* Content (read-only) */}
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

                          {/* Media thumbnails */}
                          {post.mediaItems &&
                            post.mediaItems.length > 0 && (
                              <div className="mt-3 flex gap-2 overflow-x-auto">
                                {post.mediaItems.map((media, i) =>
                                  media.type === "image" ? (
                                    <a
                                      key={i}
                                      href={media.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="shrink-0"
                                    >
                                      <img
                                        src={media.url}
                                        alt=""
                                        className="h-20 w-20 rounded-lg object-cover border border-gray-100"
                                      />
                                    </a>
                                  ) : (
                                    <div
                                      key={i}
                                      className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400 border border-gray-100"
                                    >
                                      Video
                                    </div>
                                  )
                                )}
                              </div>
                            )}

                          {/* Error detail for failed posts */}
                          {post.status === "failed" &&
                            (() => {
                              const detail = errorDetails[post.id];
                              const isLoadingError = loadingErrors.has(post.id);

                              if (!detail && !isLoadingError) {
                                return (
                                  <button
                                    onClick={() => fetchErrorDetail(post.id)}
                                    className="mt-3 inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 transition-colors cursor-pointer"
                                  >
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    Show error details
                                  </button>
                                );
                              }

                              if (isLoadingError) {
                                return (
                                  <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-400">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    Loading error details...
                                  </div>
                                );
                              }

                              if (detail) {
                                const hintConfig = detail.errorCategory
                                  ? ERROR_HINTS[detail.errorCategory]
                                  : undefined;
                                const HintIcon =
                                  hintConfig?.icon ?? AlertCircle;

                                return (
                                  <div className="mt-3 rounded-xl bg-red-50 border border-red-100 p-3 space-y-1.5">
                                    <div className="flex items-start gap-2">
                                      <HintIcon className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                                      <div className="min-w-0">
                                        <p className="text-xs font-medium text-red-700">
                                          {detail.errorMessage ??
                                            "Publishing failed"}
                                        </p>
                                        {hintConfig && (
                                          <p className="text-xs text-red-500 mt-0.5">
                                            {hintConfig.hint}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              }

                              return null;
                            })()}

                          {/* Reschedule picker */}
                          {isRescheduling && (
                            <div className="mt-3 flex items-center gap-2 flex-wrap">
                              <input
                                type="datetime-local"
                                value={rescheduleDate}
                                onChange={(e) =>
                                  setRescheduleDate(e.target.value)
                                }
                                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--sidebar-accent)]/20 focus:border-[var(--sidebar-accent)]"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                className="h-8 text-xs bg-[var(--sidebar-accent)] hover:opacity-90 text-white cursor-pointer"
                                onClick={() => handleReschedule(post.id)}
                                disabled={
                                  rescheduleMutation.isPending || !rescheduleDate
                                }
                              >
                                {rescheduleMutation.isPending && (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                                )}
                                Save
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs cursor-pointer"
                                onClick={() => setReschedulingPostId(null)}
                                disabled={rescheduleMutation.isPending}
                              >
                                Cancel
                              </Button>
                            </div>
                          )}

                          {/* Actions */}
                          {!isRescheduling && (
                            <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-gray-100">
                              {(post.status === "scheduled" ||
                                post.status === "draft") && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs cursor-pointer"
                                    onClick={() => startRescheduling(post)}
                                  >
                                    <CalendarClock className="h-3.5 w-3.5 mr-1" />
                                    {post.status === "draft"
                                      ? "Schedule"
                                      : "Reschedule"}
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
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 cursor-pointer"
                                    onClick={() => setDeleteTarget(post)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}

                              {post.status === "published" &&
                                post.platforms.map((p) => {
                                  const platformId = p.platform;
                                  const platform = getPlatform(platformId);
                                  const unsupported =
                                    UNSUPPORTED_UNPUBLISH_PLATFORMS.includes(
                                      platformId
                                    );

                                  if (unsupported) {
                                    return (
                                      <span
                                        key={platformId}
                                        className="text-xs text-gray-400"
                                      >
                                        To delete from{" "}
                                        {platform?.label ?? platformId}, go to
                                        the app directly.
                                      </span>
                                    );
                                  }

                                  return (
                                    <Button
                                      key={platformId}
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 cursor-pointer"
                                      onClick={() =>
                                        unpublishMutation.mutate({
                                          postId: post.id,
                                          platform: platformId,
                                        })
                                      }
                                      disabled={unpublishMutation.isPending}
                                    >
                                      {unpublishMutation.isPending ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                                      ) : (
                                        <EyeOff className="h-3.5 w-3.5 mr-1" />
                                      )}
                                      Unpublish from{" "}
                                      {platform?.label ?? platformId}
                                    </Button>
                                  );
                                })}
                            </div>
                          )}
                        </div>
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
          <CalendarClock className="h-10 w-10 text-gray-300 mx-auto mb-4" />
          <p className="text-sm font-medium text-gray-500 mb-1">
            {emptyMessages[statusFilter].title}
          </p>
          <p className="text-xs text-gray-400 mb-5">
            {emptyMessages[statusFilter].sub}
          </p>
          {statusFilter === "scheduled" && (
            <Link
              href={appRouter.dashboard}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--sidebar-accent)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Create post
            </Link>
          )}
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
                ? "This will remove the post from PostClaw tracking. Content already live on social platforms won\u2019t be affected."
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

    </div>
  );
}
