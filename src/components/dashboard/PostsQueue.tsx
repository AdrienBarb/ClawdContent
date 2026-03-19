"use client";

import { useState, useMemo } from "react";
import { appRouter } from "@/lib/constants/appRouter";
import { getPlatform } from "@/lib/constants/platforms";
import useApi from "@/lib/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Clock,
  MoreHorizontal,
  Trash2,
  CalendarClock,
  ExternalLink,
  XCircle,
  Loader2,
  FileText,
  Share2,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";

// Platforms that don't support unpublish via Late API
const UNPUBLISH_UNSUPPORTED = ["instagram", "tiktok", "snapchat"];

interface PostPlatform {
  platform: string;
  accountId: string;
  username: string;
  displayName: string;
  status: string;
}

interface Post {
  id: string;
  content: string;
  platforms: PostPlatform[];
  platformIds: string[];
  status: string;
  scheduledFor: string | null;
  publishedAt: string | null;
  platformPostUrl: Record<string, string>;
  mediaItems: Array<{ type: string; url: string }>;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

type TabStatus = "scheduled" | "published" | "failed";

const TABS: { value: TabStatus; label: string }[] = [
  { value: "scheduled", label: "Scheduled" },
  { value: "published", label: "Published" },
  { value: "failed", label: "Failed" },
];

const SORT_BY: Record<TabStatus, string> = {
  scheduled: "scheduled-asc",
  published: "scheduled-desc",
  failed: "created-desc",
};

function getTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

function getShortTimezone(): string {
  try {
    const tz = getTimezone();
    // Extract city name from timezone (e.g., "Europe/Paris" -> "Paris")
    const parts = tz.split("/");
    return parts[parts.length - 1].replace(/_/g, " ");
  } catch {
    return "UTC";
  }
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDayHeader(dateStr: string): { label: string; date: string } {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const postDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
  const diffDays = Math.round(
    (postDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  const monthDay = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  if (diffDays === 0) return { label: "Today", date: monthDay };
  if (diffDays === 1) return { label: "Tomorrow", date: monthDay };
  if (diffDays === -1) return { label: "Yesterday", date: monthDay };

  const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
  return { label: weekday, date: monthDay };
}

function getDayKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function groupPostsByDay(posts: Post[]): Map<string, Post[]> {
  const groups = new Map<string, Post[]>();
  for (const post of posts) {
    const dateStr = post.scheduledFor ?? post.publishedAt ?? post.createdAt;
    const key = getDayKey(dateStr);
    const existing = groups.get(key) ?? [];
    existing.push(post);
    groups.set(key, existing);
  }
  return groups;
}

// Convert local datetime-local value to ISO string
function localToISO(localValue: string): string {
  const date = new Date(localValue);
  return date.toISOString();
}

// Convert ISO string to datetime-local input value
function isoToLocal(isoStr: string): string {
  const date = new Date(isoStr);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

export default function PostsQueue({ timezone }: { timezone: string | null }) {
  const { useGet, usePost } = useApi();
  const [activeTab, setActiveTab] = useState<TabStatus>("scheduled");
  const [page, setPage] = useState(1);

  // Action states
  const [deleteTarget, setDeleteTarget] = useState<Post | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<Post | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [unpublishTarget, setUnpublishTarget] = useState<Post | null>(null);
  const [unpublishPlatform, setUnpublishPlatform] = useState<string | null>(
    null
  );

  const sortBy = SORT_BY[activeTab];

  const {
    data,
    isLoading,
    refetch,
  } = useGet(appRouter.api.posts, { status: activeTab, limit: 50, page, sortBy }, {
    refetchInterval: 15000,
  }) as {
    data: { posts: Post[]; pagination: Pagination } | undefined;
    isLoading: boolean;
    refetch: () => void;
  };

  // Fetch counts for each tab
  const { data: scheduledData } = useGet(
    appRouter.api.posts,
    { status: "scheduled", limit: 1 },
    { refetchInterval: 30000 }
  ) as { data: { pagination: Pagination } | undefined };

  const { data: publishedData } = useGet(
    appRouter.api.posts,
    { status: "published", limit: 1 },
    { refetchInterval: 30000 }
  ) as { data: { pagination: Pagination } | undefined };

  const { data: failedData } = useGet(
    appRouter.api.posts,
    { status: "failed", limit: 1 },
    { refetchInterval: 30000 }
  ) as { data: { pagination: Pagination } | undefined };

  const tabCounts: Record<TabStatus, number | null> = {
    scheduled: scheduledData?.pagination?.total ?? null,
    published: publishedData?.pagination?.total ?? null,
    failed: failedData?.pagination?.total ?? null,
  };

  // Mutations
  const { mutate: deletePost, isPending: isDeleting } = usePost(
    appRouter.api.postsDelete,
    {
      onSuccess: () => {
        toast.success("Post deleted");
        setDeleteTarget(null);
        refetch();
      },
      onError: () => {
        toast.error("Failed to delete post");
      },
    }
  );

  const { mutate: reschedulePost, isPending: isRescheduling } = usePost(
    appRouter.api.postsReschedule,
    {
      onSuccess: () => {
        toast.success("Post rescheduled");
        setRescheduleTarget(null);
        setRescheduleDate("");
        refetch();
      },
      onError: () => {
        toast.error("Failed to reschedule post");
      },
    }
  );

  const { mutate: unpublishPost, isPending: isUnpublishing } = usePost(
    appRouter.api.postsUnpublish,
    {
      onSuccess: () => {
        toast.success("Post unpublished from platform");
        setUnpublishTarget(null);
        setUnpublishPlatform(null);
        refetch();
      },
      onError: () => {
        toast.error("Failed to unpublish post");
      },
    }
  );

  const posts: Post[] = useMemo(() => data?.posts ?? [], [data?.posts]);
  const pagination = data?.pagination;
  const grouped = useMemo(() => groupPostsByDay(posts), [posts]);
  const tzLabel = timezone ? timezone.split("/").pop()?.replace(/_/g, " ") : getShortTimezone();

  const handleTabChange = (tab: TabStatus) => {
    setActiveTab(tab);
    setPage(1);
  };

  const openReschedule = (post: Post) => {
    setRescheduleTarget(post);
    setRescheduleDate(
      post.scheduledFor ? isoToLocal(post.scheduledFor) : ""
    );
  };

  const handleReschedule = () => {
    if (!rescheduleTarget || !rescheduleDate) return;
    reschedulePost({
      postId: rescheduleTarget.id,
      scheduledFor: localToISO(rescheduleDate),
    });
  };

  const openUnpublish = (post: Post) => {
    setUnpublishTarget(post);
    setUnpublishPlatform(null);
  };

  const handleUnpublish = () => {
    if (!unpublishTarget || !unpublishPlatform) return;
    unpublishPost({
      postId: unpublishTarget.id,
      platform: unpublishPlatform,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-6 w-48" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-gray-200">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.value;
          const count = tabCounts[tab.value];
          return (
            <button
              key={tab.value}
              onClick={() => handleTabChange(tab.value)}
              className={`relative pb-3 text-sm font-medium transition-colors cursor-pointer ${
                isActive
                  ? "text-gray-900"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {tab.label}
              {count !== null && (
                <span
                  className={`ml-1.5 ${isActive ? "text-gray-900" : "text-gray-400"}`}
                >
                  ({count})
                </span>
              )}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e8614d] rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Posts grouped by day */}
      {posts.length > 0 ? (
        <div className="space-y-8">
          {Array.from(grouped.entries()).map(([dayKey, dayPosts]) => {
            const refDate =
              dayPosts[0].scheduledFor ??
              dayPosts[0].publishedAt ??
              dayPosts[0].createdAt;
            const { label, date } = formatDayHeader(refDate);
            return (
              <div key={dayKey}>
                {/* Day header */}
                <div className="flex items-baseline gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {label}
                  </h3>
                  <span className="text-sm text-gray-400">{date}</span>
                  {label === "Today" && (
                    <span className="text-xs text-gray-400">({tzLabel})</span>
                  )}
                </div>

                {/* Post rows */}
                <div className="space-y-2">
                  {dayPosts.map((post) => (
                    <PostRow
                      key={post.id}
                      post={post}
                      activeTab={activeTab}
                      onDelete={() => setDeleteTarget(post)}
                      onReschedule={() => openReschedule(post)}
                      onUnpublish={() => openUnpublish(post)}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-500">
                Page {page} of {pagination.pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= pagination.pages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white/50 p-10 text-center">
          <FileText className="h-8 w-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500 mb-1">
            {activeTab === "scheduled" && "No scheduled posts"}
            {activeTab === "published" && "No published posts yet"}
            {activeTab === "failed" && "No failed posts"}
          </p>
          <p className="text-xs text-gray-400">
            {activeTab === "scheduled" &&
              "Posts scheduled by your AI assistant will appear here."}
            {activeTab === "published" &&
              "Published posts will appear here so you can track or unpublish them."}
            {activeTab === "failed" &&
              "Posts that failed to publish will appear here so you can retry."}
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
            <DialogTitle>
              {deleteTarget?.status === "scheduled"
                ? "Cancel scheduled post"
                : "Delete post"}
            </DialogTitle>
            <DialogDescription>
              {deleteTarget?.status === "scheduled"
                ? "This will cancel the scheduled post. It will not be published."
                : "This will permanently delete this post. This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          {deleteTarget && (
            <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700 max-h-24 overflow-hidden">
              {deleteTarget.content.length > 200
                ? `${deleteTarget.content.slice(0, 200)}...`
                : deleteTarget.content}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              Keep
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
              ) : deleteTarget?.status === "scheduled" ? (
                "Cancel post"
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule dialog */}
      <Dialog
        open={rescheduleTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRescheduleTarget(null);
            setRescheduleDate("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {rescheduleTarget?.status === "failed"
                ? "Retry post"
                : "Reschedule post"}
            </DialogTitle>
            <DialogDescription>
              {rescheduleTarget?.status === "failed"
                ? "Pick a new time to retry publishing this post."
                : "Choose a new date and time for this post."}
            </DialogDescription>
          </DialogHeader>
          {rescheduleTarget && (
            <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700 max-h-24 overflow-hidden">
              {rescheduleTarget.content.length > 200
                ? `${rescheduleTarget.content.slice(0, 200)}...`
                : rescheduleTarget.content}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="reschedule-date">
              New date & time ({tzLabel})
            </Label>
            <Input
              id="reschedule-date"
              type="datetime-local"
              value={rescheduleDate}
              onChange={(e) => setRescheduleDate(e.target.value)}
              min={isoToLocal(new Date().toISOString())}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRescheduleTarget(null);
                setRescheduleDate("");
              }}
              disabled={isRescheduling}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReschedule}
              disabled={isRescheduling || !rescheduleDate}
              className="bg-[#e8614d] hover:bg-[#d4553f] text-white"
            >
              {isRescheduling ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : rescheduleTarget?.status === "failed" ? (
                "Schedule retry"
              ) : (
                "Reschedule"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unpublish dialog */}
      <Dialog
        open={unpublishTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setUnpublishTarget(null);
            setUnpublishPlatform(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unpublish post</DialogTitle>
            <DialogDescription>
              Remove this post from a platform. The post will be deleted from the
              social network and marked as cancelled.
            </DialogDescription>
          </DialogHeader>

          {unpublishTarget && (
            <>
              <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700 max-h-24 overflow-hidden">
                {unpublishTarget.content.length > 200
                  ? `${unpublishTarget.content.slice(0, 200)}...`
                  : unpublishTarget.content}
              </div>

              <div className="space-y-2">
                <Label>Select platform to unpublish from</Label>
                <div className="space-y-2">
                  {unpublishTarget.platformIds.map((platformId) => {
                    const platform = getPlatform(platformId);
                    const isUnsupported =
                      UNPUBLISH_UNSUPPORTED.includes(platformId);
                    const isSelected = unpublishPlatform === platformId;

                    return (
                      <button
                        key={platformId}
                        onClick={() =>
                          !isUnsupported && setUnpublishPlatform(platformId)
                        }
                        disabled={isUnsupported}
                        className={`w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-all cursor-pointer ${
                          isSelected
                            ? "border-[#e8614d] bg-red-50"
                            : isUnsupported
                              ? "border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed"
                              : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <span
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white"
                          style={{
                            backgroundColor: platform?.color ?? "#6b7280",
                          }}
                        >
                          {platform?.icon ?? <Share2 className="h-3 w-3" />}
                        </span>
                        <span className="font-medium text-gray-700">
                          {platform?.label ?? platformId}
                        </span>
                        {isUnsupported && (
                          <span className="ml-auto flex items-center gap-1 text-xs text-amber-600">
                            <AlertTriangle className="h-3 w-3" />
                            Not supported
                          </span>
                        )}
                        {unpublishTarget.platformPostUrl[platformId] &&
                          !isUnsupported && (
                            <a
                              href={unpublishTarget.platformPostUrl[platformId]}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="ml-auto text-xs text-gray-400 hover:text-gray-600"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setUnpublishTarget(null);
                setUnpublishPlatform(null);
              }}
              disabled={isUnpublishing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleUnpublish}
              disabled={isUnpublishing || !unpublishPlatform}
            >
              {isUnpublishing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Unpublishing...
                </>
              ) : (
                "Unpublish"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Individual post row component
function PostRow({
  post,
  activeTab,
  onDelete,
  onReschedule,
  onUnpublish,
}: {
  post: Post;
  activeTab: TabStatus;
  onDelete: () => void;
  onReschedule: () => void;
  onUnpublish: () => void;
}) {
  const timeStr = post.scheduledFor ?? post.publishedAt ?? post.createdAt;
  const formattedTime = formatTime(timeStr);

  return (
    <div className="group flex items-center gap-3 rounded-xl bg-white px-4 py-3 border border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-sm transition-shadow">
      {/* Status indicator */}
      {activeTab === "scheduled" && (
        <Clock className="h-4 w-4 text-blue-400 shrink-0" />
      )}
      {activeTab === "failed" && (
        <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
      )}

      {/* Time */}
      <span className="text-sm font-medium text-gray-500 w-20 shrink-0">
        {formattedTime}
      </span>

      {/* Platform icons */}
      <div className="flex items-center gap-1 shrink-0">
        {post.platformIds.map((platformId) => {
          const platform = getPlatform(platformId);
          return (
            <span
              key={platformId}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-white"
              style={{
                backgroundColor: platform?.color ?? "#6b7280",
              }}
              title={platform?.label ?? platformId}
            >
              <span className="[&_svg]:h-3 [&_svg]:w-3">
                {platform?.icon ?? <Share2 className="h-3 w-3" />}
              </span>
            </span>
          );
        })}
      </div>

      {/* Content preview */}
      <p className="flex-1 text-sm text-gray-700 truncate min-w-0">
        {post.content}
      </p>

      {/* Media indicator */}
      {post.mediaItems.length > 0 && (
        <span className="text-xs text-gray-400 shrink-0">
          {post.mediaItems.length} media
        </span>
      )}

      {/* Actions dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="shrink-0 flex h-7 w-7 items-center justify-center rounded-md text-gray-400 opacity-0 group-hover:opacity-100 hover:text-gray-600 hover:bg-gray-100 transition-all cursor-pointer">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {/* Scheduled actions */}
          {activeTab === "scheduled" && (
            <>
              <DropdownMenuItem
                onClick={onReschedule}
                className="cursor-pointer"
              >
                <CalendarClock className="h-4 w-4 mr-2" />
                Reschedule
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDelete}
                className="text-red-600 focus:text-red-600 cursor-pointer"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancel post
              </DropdownMenuItem>
            </>
          )}

          {/* Published actions */}
          {activeTab === "published" && (
            <>
              {Object.entries(post.platformPostUrl).map(
                ([platformId, url]) => {
                  const platform = getPlatform(platformId);
                  return (
                    <DropdownMenuItem key={platformId} asChild>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="cursor-pointer"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View on {platform?.label ?? platformId}
                      </a>
                    </DropdownMenuItem>
                  );
                }
              )}
              {Object.keys(post.platformPostUrl).length > 0 && (
                <DropdownMenuSeparator />
              )}
              <DropdownMenuItem
                onClick={onUnpublish}
                className="text-red-600 focus:text-red-600 cursor-pointer"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Unpublish
              </DropdownMenuItem>
            </>
          )}

          {/* Failed actions */}
          {activeTab === "failed" && (
            <>
              <DropdownMenuItem
                onClick={onReschedule}
                className="cursor-pointer"
              >
                <CalendarClock className="h-4 w-4 mr-2" />
                Retry with new time
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDelete}
                className="text-red-600 focus:text-red-600 cursor-pointer"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
