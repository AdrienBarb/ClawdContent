"use client";

import { useState } from "react";
import Link from "next/link";
import { appRouter } from "@/lib/constants/appRouter";
import SubscribeModal from "@/components/dashboard/SubscribeModal";
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
  ChevronLeft,
  ChevronRight,
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

interface PlatformError {
  platform: string;
  errorMessage: string | null;
  errorCategory: string | null;
  errorSource: string | null;
}

interface PostErrorDetail {
  platformErrors: PlatformError[];
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
  if (post.status === "published") return post.scheduledAt ?? post.publishedAt ?? post.createdAt;
  return post.createdAt;
}

/**
 * Group posts by date.
 * Scheduled: ascending (soonest first — it's a queue).
 * Published/Failed: descending (most recent first).
 */
/** Group posts by date, preserving server sort order. */
function groupByDate(posts: Post[]): [string, Post[]][] {
  const groups = new Map<string, Post[]>();
  for (const post of posts) {
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
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);

  // Default to "scheduled" — the queue view
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("scheduled");
  const [page, setPage] = useState(1);
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

  const { data: dashboardStatus } = useGet(appRouter.api.dashboardStatus);
  const subStatus = (dashboardStatus as { subscription?: { status: string } } | undefined)?.subscription?.status;
  const hasActiveSubscription = subStatus === "active" || subStatus === "trialing" || subStatus === "past_due";

  const sortBy = statusFilter === "scheduled" ? "scheduled-asc" : "scheduled-desc";

  const { data, isLoading, refetch } = useGet(
    appRouter.api.posts,
    { status: statusFilter, page, limit: 20, sortBy },
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

  const posts: Post[] = data?.posts ?? [];
  const pagination = data?.pagination as
    | { page: number; limit: number; total: number; pages: number }
    | undefined;

  const grouped = groupByDate(posts);

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
          platformErrors: res.post.platformErrors ?? [],
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

  const showGlassPreview = !hasActiveSubscription;

  return (
    <div className={showGlassPreview ? "relative min-h-[calc(100vh-8rem)]" : "space-y-6"}>
      {/* Page title — always visible */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Posts</h1>
        {!showGlassPreview && (
          <Link
            href={appRouter.dashboard}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--sidebar-accent)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Create post
          </Link>
        )}
      </div>

      {showGlassPreview ? (
        <div className="absolute inset-0 mt-24">
          {/* Blurred fake data only */}
          <div className="blur-[1.5px] pointer-events-none select-none space-y-6 px-6 max-w-5xl mx-auto" style={{ maskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black 30%, transparent 80%)", WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black 30%, transparent 80%)" }}>
            {/* Fake tabs */}
            <div className="flex gap-1.5 rounded-xl bg-gray-100 p-1 w-fit">
              {STATUS_TABS.map((tab, idx) => {
                const Icon = tab.icon;
                return (
                  <span key={tab.value} className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium ${idx === 0 ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                    {idx === 0 && <span className="text-xs text-gray-400">3</span>}
                  </span>
                );
              })}
            </div>

            {/* Fake timeline */}
            <div className="space-y-8">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 whitespace-nowrap">Tomorrow</h3>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
                <div className="space-y-4">
                  {[
                    { time: "9:00 AM", platforms: ["twitter", "linkedin"], content: "Just shipped a major update to our product! Here's what changed and why it matters for your workflow..." },
                    { time: "2:30 PM", platforms: ["instagram"], content: "Behind the scenes of our creative process. Swipe to see how we go from idea to final design" },
                    { time: "6:00 PM", platforms: ["twitter", "bluesky"], content: "Quick tip: The best time to engage with your audience is when they're already scrolling. Here's how to find your peak hours..." },
                  ].map((item, idx) => (
                    <div key={idx} className="flex gap-4">
                      <div className="w-20 shrink-0 pt-4 text-right">
                        <span className="text-sm font-semibold text-gray-900 tabular-nums">{item.time}</span>
                      </div>
                      <div className="flex flex-col items-center shrink-0">
                        <div className="mt-5 h-2.5 w-2.5 rounded-full bg-[var(--sidebar-accent)]" />
                        <div className="flex-1 w-px bg-gray-200 mt-1" />
                      </div>
                      <div className="flex-1 min-w-0 pb-2">
                        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
                          <div className="flex items-center gap-1.5 mb-3">
                            {item.platforms.map((platformId) => {
                              const platform = getPlatform(platformId);
                              return (
                                <span key={platformId} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white" style={{ backgroundColor: platform?.color ?? "#6b7280" }}>
                                  {platform?.icon ?? <Share2 className="h-3.5 w-3.5" />}
                                </span>
                              );
                            })}
                          </div>
                          <p className="text-sm text-gray-900 leading-relaxed">{item.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Overlay — centered in viewport */}
          <div className="fixed inset-0 z-10 flex items-center justify-center pointer-events-none md:pl-64">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200/60 px-8 py-8 max-w-md w-full text-center pointer-events-auto">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--sidebar-accent)] mb-3">
                Content queue
              </p>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Your posts will show up here
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-5">
                Chat with your AI manager to create content. It handles the rest.
              </p>

              <div className="flex flex-col gap-2.5 mb-6 text-left">
                <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--sidebar-accent)]/10 text-[var(--sidebar-accent)]">
                    <CalendarClock className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Schedule across platforms</p>
                    <p className="text-xs text-gray-500">Queue posts for X, LinkedIn, Instagram, and more</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--sidebar-accent)]/10 text-[var(--sidebar-accent)]">
                    <FileEdit className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">AI writes your content</p>
                    <p className="text-xs text-gray-500">Just describe what you want — your manager drafts it</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--sidebar-accent)]/10 text-[var(--sidebar-accent)]">
                    <CheckCircle2 className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Track what went live</p>
                    <p className="text-xs text-gray-500">See published, scheduled, and draft posts in one view</p>
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
      ) : (
        /* ---- Normal view when user has posts ---- */
        <>
          {/* Status tabs */}
          <div className="flex gap-1.5 rounded-xl bg-gray-100 p-1 w-fit overflow-x-auto">
            {STATUS_TABS.map((tab) => {
              const Icon = tab.icon;
              const active = statusFilter === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => { setStatusFilter(tab.value); setPage(1); }}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                    active
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                  {active && pagination && pagination.total > 0 && (
                    <span className="text-xs tabular-nums text-gray-400">
                      {pagination.total}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Timeline */}
          {grouped.length > 0 ? (
            <div className="space-y-8">
              {grouped.map(([dateKey, datePosts]) => (
                <div key={dateKey}>
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                      {formatDateHeader(dateKey)}
                    </h3>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                  <div className="space-y-4">
                    {datePosts.map((post) => {
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
                          <div className="w-20 shrink-0 pt-4 text-right">
                            <span className="text-sm font-semibold text-gray-900 tabular-nums">
                              {timeStr}
                            </span>
                          </div>
                          <div className="flex flex-col items-center shrink-0">
                            <div className="mt-5 h-2.5 w-2.5 rounded-full bg-[var(--sidebar-accent)]" />
                            <div className="flex-1 w-px bg-gray-200 mt-1" />
                          </div>
                          <div className="flex-1 min-w-0 pb-2">
                            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
                              <div className="flex items-center gap-1.5 mb-3">
                                {post.platforms.map((p) => {
                                  const platformId = p.platform;
                                  const platform = getPlatform(platformId);
                                  return (
                                    <span
                                      key={platformId}
                                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white"
                                      style={{ backgroundColor: platform?.color ?? "#6b7280" }}
                                      title={platform?.label ?? platformId}
                                    >
                                      {platform?.icon ?? <Share2 className="h-3.5 w-3.5" />}
                                    </span>
                                  );
                                })}
                              </div>
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
                                      <>Show less <ChevronUp className="h-3 w-3" /></>
                                    ) : (
                                      <>Show more <ChevronDown className="h-3 w-3" /></>
                                    )}
                                  </button>
                                )}
                              </div>
                              {post.mediaItems && post.mediaItems.length > 0 && (
                                <div className="mt-3 flex gap-2 overflow-x-auto">
                                  {post.mediaItems.map((media, i) =>
                                    media.type === "image" ? (
                                      <a key={i} href={media.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                                        <img src={media.url} alt="" className="h-20 w-20 rounded-lg object-cover border border-gray-100" />
                                      </a>
                                    ) : (
                                      <div key={i} className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400 border border-gray-100">
                                        Video
                                      </div>
                                    )
                                  )}
                                </div>
                              )}
                              {post.status === "failed" &&
                                (() => {
                                  const detail = errorDetails[post.id];
                                  const isLoadingError = loadingErrors.has(post.id);
                                  if (!detail && !isLoadingError) {
                                    return (
                                      <button onClick={() => fetchErrorDetail(post.id)} className="mt-3 inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 transition-colors cursor-pointer">
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
                                    const errors = detail.platformErrors;
                                    if (errors.length === 0) {
                                      return (
                                        <div className="mt-3 rounded-xl bg-red-50 border border-red-100 p-3">
                                          <div className="flex items-start gap-2">
                                            <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                                            <p className="text-xs font-medium text-red-700">Publishing failed</p>
                                          </div>
                                        </div>
                                      );
                                    }
                                    return (
                                      <div className="mt-3 space-y-2">
                                        {errors.map((err) => {
                                          const hintConfig = err.errorCategory ? ERROR_HINTS[err.errorCategory] : undefined;
                                          const HintIcon = hintConfig?.icon ?? AlertCircle;
                                          const platform = getPlatform(err.platform);
                                          return (
                                            <div key={err.platform} className="rounded-xl bg-red-50 border border-red-100 p-3 space-y-1.5">
                                              <div className="flex items-start gap-2">
                                                <HintIcon className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                                                <div className="min-w-0">
                                                  <p className="text-xs font-medium text-red-700">
                                                    {platform?.label ?? err.platform}: {err.errorMessage ?? "Publishing failed"}
                                                  </p>
                                                  {hintConfig && <p className="text-xs text-red-500 mt-0.5">{hintConfig.hint}</p>}
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                              {isRescheduling && (
                                <div className="mt-3 flex items-center gap-2 flex-wrap">
                                  <input type="datetime-local" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--sidebar-accent)]/20 focus:border-[var(--sidebar-accent)]" autoFocus />
                                  <Button size="sm" className="h-8 text-xs bg-[var(--sidebar-accent)] hover:opacity-90 text-white cursor-pointer" onClick={() => handleReschedule(post.id)} disabled={rescheduleMutation.isPending || !rescheduleDate}>
                                    {rescheduleMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                                    Save
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-8 text-xs cursor-pointer" onClick={() => setReschedulingPostId(null)} disabled={rescheduleMutation.isPending}>Cancel</Button>
                                </div>
                              )}
                              {!isRescheduling && (
                                <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-gray-100">
                                  {(post.status === "scheduled" || post.status === "draft") && (
                                    <>
                                      <Button variant="outline" size="sm" className="h-8 text-xs cursor-pointer" onClick={() => startRescheduling(post)}>
                                        <CalendarClock className="h-3.5 w-3.5 mr-1" />
                                        {post.status === "draft" ? "Schedule" : "Reschedule"}
                                      </Button>
                                      <Button variant="ghost" size="sm" className="h-8 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 cursor-pointer" onClick={() => setDeleteTarget(post)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </>
                                  )}
                                  {post.status === "failed" && (
                                    <>
                                      <Button size="sm" className="h-8 text-xs bg-[var(--sidebar-accent)] hover:opacity-90 text-white cursor-pointer" onClick={() => retryMutation.mutate({ postId: post.id })} disabled={retryMutation.isPending}>
                                        {retryMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
                                        Retry
                                      </Button>
                                      <Button variant="ghost" size="sm" className="h-8 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 cursor-pointer" onClick={() => setDeleteTarget(post)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </>
                                  )}
                                  {post.status === "published" &&
                                    post.platforms.map((p) => {
                                      const platformId = p.platform;
                                      const platform = getPlatform(platformId);
                                      const unsupported = UNSUPPORTED_UNPUBLISH_PLATFORMS.includes(platformId);
                                      if (unsupported) {
                                        return <span key={platformId} className="text-xs text-gray-400">To delete from {platform?.label ?? platformId}, go to the app directly.</span>;
                                      }
                                      return (
                                        <Button key={platformId} variant="ghost" size="sm" className="h-8 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 cursor-pointer" onClick={() => unpublishMutation.mutate({ postId: post.id, platform: platformId })} disabled={unpublishMutation.isPending}>
                                          {unpublishMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <EyeOff className="h-3.5 w-3.5 mr-1" />}
                                          Unpublish from {platform?.label ?? platformId}
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
            <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white/50 p-12 text-center">
              <CalendarClock className="h-10 w-10 text-gray-300 mx-auto mb-4" />
              <p className="text-sm font-medium text-gray-500 mb-1">
                {emptyMessages[statusFilter].title}
              </p>
              <p className="text-xs text-gray-400 mb-5">
                {emptyMessages[statusFilter].sub}
              </p>
              {(statusFilter === "scheduled" || statusFilter === "draft") && (
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

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                className="h-8 cursor-pointer"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-500 tabular-nums px-2">
                {page} / {pagination.pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 cursor-pointer"
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={page >= pagination.pages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
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

      <SubscribeModal
        open={showSubscribeModal}
        onOpenChange={setShowSubscribeModal}
      />
    </div>
  );
}
