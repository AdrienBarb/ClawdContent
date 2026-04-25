"use client";

import { useState } from "react";
import useApi from "@/lib/hooks/useApi";
import { useDashboardStatus } from "@/lib/hooks/useDashboardStatus";
import { appRouter } from "@/lib/constants/appRouter";
import { getPlatform } from "@/lib/constants/platforms";
import toast from "react-hot-toast";
import Link from "next/link";
import {
  SpinnerGapIcon,
  PencilSimpleIcon,
  PaperPlaneTiltIcon,
  DotsThreeIcon,
  TrashIcon,
  ArrowCounterClockwiseIcon,
  WarningCircleIcon,
  NoteIcon,
  LightningIcon,
  CheckCircleIcon,
  ArrowSquareOutIcon,
  EyeSlashIcon,
} from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


interface AccountInfo {
  id: string;
  platform: string;
  username: string;
  status: string;
}

interface PostItem {
  id: string;
  content: string;
  platforms: { platform: string; platformPostUrl?: string; errorMessage?: string; errorCategory?: string }[];
  mediaItems?: { url: string; type: string }[];
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
}

type Tab = "upcoming" | "published" | "drafts" | "failed";

const TAB_TO_STATUS: Record<Tab, string> = {
  upcoming: "scheduled",
  published: "published",
  drafts: "draft",
  failed: "failed",
};

export default function ChannelPage({ channelId }: { channelId: string }) {
  const { useGet } = useApi();
  const [activeTab, setActiveTab] = useState<Tab>("upcoming");
  const [editingPost, setEditingPost] = useState<PostItem | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { data: status, isLoading: statusLoading } = useDashboardStatus();

  const accounts: AccountInfo[] = (status?.accounts ?? []).filter(
    (a: AccountInfo) => a.status === "active"
  );
  const channel = accounts.find((a) => a.id === channelId);

  // Fetch posts for active tab
  const postsParams: Record<string, string> = {
    status: TAB_TO_STATUS[activeTab],
    limit: "50",
  };
  if (channel) postsParams.platform = channel.platform;

  const { data: postsData, isLoading: postsLoading, refetch: refetchPosts } = useGet(
    appRouter.api.posts,
    postsParams,
  );
  const posts: PostItem[] = postsData?.posts ?? [];

  // Fetch counts for all tabs
  const countParams = (s: string) => {
    const p: Record<string, string> = { status: s, limit: "1" };
    if (channel) p.platform = channel.platform;
    return p;
  };
  const { data: scheduledData } = useGet(appRouter.api.posts, countParams("scheduled"));
  const { data: publishedData } = useGet(appRouter.api.posts, countParams("published"));
  const { data: draftData } = useGet(appRouter.api.posts, countParams("draft"));
  const { data: failedData } = useGet(appRouter.api.posts, countParams("failed"));

  const counts: Record<Tab, number> = {
    upcoming: scheduledData?.pagination?.total ?? 0,
    published: publishedData?.pagination?.total ?? 0,
    drafts: draftData?.pagination?.total ?? 0,
    failed: failedData?.pagination?.total ?? 0,
  };

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <SpinnerGapIcon className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-gray-500">This account isn&apos;t connected anymore</p>
      </div>
    );
  }

  const platform = getPlatform(channel.platform);

  const handleAction = async (action: string, postId: string) => {
    setActionLoading(postId);
    try {
      const res = await fetch(appRouter.api.postsActions, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.error === "VALIDATION_FAILED" && data.validationErrors) {
          for (const e of data.validationErrors) toast.error(`${e.platform}: ${e.error}`);
        } else {
          toast.error(data?.error || "Something went wrong");
        }
        return;
      }
      const messages: Record<string, string> = {
        publish: "Post published!",
        "move-to-draft": "Moved to drafts",
        delete: "Post deleted",
        unpublish: "Post removed",
        retry: "Retrying post...",
      };
      toast.success(messages[action] ?? "Done");
      refetchPosts();
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 pb-4 mb-8 -mx-8 px-8 pt-6 -mt-6">
        <div className="flex items-center gap-3 mb-4">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full text-white shrink-0"
            style={{ backgroundColor: platform?.color ?? "#666" }}
          >
            {platform?.icon}
          </span>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
              {platform?.label ?? channel.platform}
            </h1>
            <p className="text-sm text-gray-500">@{channel.username}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <TabButton label="Upcoming" active={activeTab === "upcoming"} count={counts.upcoming} onClick={() => setActiveTab("upcoming")} />
          <TabButton label="Published" active={activeTab === "published"} count={counts.published} onClick={() => setActiveTab("published")} />
          <TabButton label="Drafts" active={activeTab === "drafts"} count={counts.drafts} onClick={() => setActiveTab("drafts")} />
          <TabButton label="Failed" active={activeTab === "failed"} count={counts.failed} accent={counts.failed > 0} onClick={() => setActiveTab("failed")} />
        </div>
      </div>

      {/* Posts list */}
      {postsLoading ? (
        <div className="flex items-center justify-center h-32">
          <SpinnerGapIcon className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      ) : posts.length === 0 ? (
        <EmptyState tab={activeTab} platformLabel={platform?.label ?? channel.platform} />
      ) : (
        <div className="space-y-3 max-w-3xl mx-auto">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              channel={channel}
              platform={platform}
              loading={actionLoading === post.id}
              onEdit={() => setEditingPost(post)}
              onAction={handleAction}
            />
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editingPost && (
        <EditPostModal
          post={editingPost}
          platform={platform}
          channel={channel}
          onClose={() => setEditingPost(null)}
          onSave={async (updated) => {
            try {
              const res = await fetch(appRouter.api.postsUpdate, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ postId: editingPost.id, content: updated.content }),
              });
              if (!res.ok) throw new Error("Failed to save");
              toast.success("Post updated");
              refetchPosts();
              setEditingPost(null);
            } catch {
              toast.error("Failed to save changes");
            }
          }}
        />
      )}
    </div>
  );
}

// --- Sub-components ---

function PostCard({
  post,
  channel,
  platform,
  loading,
  onEdit,
  onAction,
}: {
  post: PostItem;
  channel: AccountInfo;
  platform: ReturnType<typeof getPlatform>;
  loading: boolean;
  onEdit: () => void;
  onAction: (action: string, postId: string) => void;
}) {
  const time = post.scheduledAt ?? post.publishedAt ?? post.createdAt;
  const isFailed = post.status === "failed" || post.status === "partial";
  const isPublished = post.status === "published";

  // Extract error message from platform errors
  const errorMessage = isFailed
    ? post.platforms.find((p) => p.errorMessage)?.errorMessage
    : null;

  // Extract live post URL for published posts
  const postUrl = isPublished
    ? post.platforms.find((p) => p.platformPostUrl)?.platformPostUrl
    : null;

  const statusConfig: Record<string, { label: string; color: string }> = {
    scheduled: { label: "Scheduled", color: "text-blue-600" },
    published: { label: "Published", color: "text-green-600" },
    draft: { label: "Draft", color: "text-gray-500" },
    failed: { label: "Failed", color: "text-red-600" },
    partial: { label: "Partially failed", color: "text-orange-600" },
  };
  const { label: statusLabel, color: statusColor } = statusConfig[post.status] ?? { label: post.status, color: "text-gray-400" };

  return (
    <div className={`rounded-xl border bg-white overflow-hidden ${isFailed ? "border-red-200" : "border-gray-200"}`}>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2.5">
          {platform && (
            <span className="flex h-6 w-6 items-center justify-center rounded-full text-white shrink-0" style={{ backgroundColor: platform.color }}>
              {platform.icon}
            </span>
          )}
          <span className="text-sm font-medium text-gray-900">{channel.username}</span>
          <span className="ml-auto text-xs text-gray-400">
            {new Date(time).toLocaleDateString(undefined, {
              weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
            })}
          </span>
        </div>
        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{post.content}</p>
        {post.mediaItems && post.mediaItems.length > 0 && (
          <div className="flex gap-2 mt-3">
            {post.mediaItems.map((media, i) => (
              media.type === "video" ? (
                <video key={i} src={media.url} className="h-20 rounded-lg" controls />
              ) : (
                <img key={i} src={media.url} alt="" className="h-20 rounded-lg object-cover" />
              )
            ))}
          </div>
        )}
        {isFailed && errorMessage && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5">
            <WarningCircleIcon className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700">{errorMessage}</p>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${statusColor}`}>
            {statusLabel}
          </span>
          {postUrl && (
            <a href={postUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors">
              <ArrowSquareOutIcon className="h-3.5 w-3.5" />
              View post
            </a>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {loading && <SpinnerGapIcon className="h-4 w-4 animate-spin text-gray-400" />}
          {!loading && (
            <>
              {(post.status === "scheduled" || post.status === "draft") && (
                <button onClick={onEdit} className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer">
                  <PencilSimpleIcon className="h-3.5 w-3.5" />
                </button>
              )}
              <PostActions post={post} onAction={onAction} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PostActions({
  post,
  onAction,
}: {
  post: PostItem;
  onAction: (action: string, postId: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer">
          <DotsThreeIcon className="h-4 w-4" weight="bold" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {/* Scheduled posts */}
        {post.status === "scheduled" && (
          <>
            <DropdownMenuItem onClick={() => onAction("publish", post.id)}>
              <PaperPlaneTiltIcon className="h-4 w-4" />
              Publish now
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction("move-to-draft", post.id)}>
              <NoteIcon className="h-4 w-4" />
              Move to drafts
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Draft posts */}
        {post.status === "draft" && (
          <>
            <DropdownMenuItem onClick={() => onAction("publish", post.id)}>
              <PaperPlaneTiltIcon className="h-4 w-4" />
              Publish now
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Failed / partial posts */}
        {(post.status === "failed" || post.status === "partial") && (
          <>
            <DropdownMenuItem onClick={() => onAction("retry", post.id)}>
              <ArrowCounterClockwiseIcon className="h-4 w-4" />
              Retry
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Published posts can only be unpublished, not deleted */}
        {post.status === "published" ? (
          <DropdownMenuItem onClick={() => onAction("unpublish", post.id)} className="text-red-600">
            <EyeSlashIcon className="h-4 w-4" />
            Remove from {post.platforms[0]?.platform ?? "platform"}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => onAction("delete", post.id)} className="text-red-600">
            <TrashIcon className="h-4 w-4" />
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EditPostModal({
  post,
  platform,
  channel,
  onClose,
  onSave,
}: {
  post: PostItem;
  platform: ReturnType<typeof getPlatform>;
  channel: AccountInfo;
  onClose: () => void;
  onSave: (updated: { content: string }) => void;
}) {
  const [content, setContent] = useState(post.content);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden rounded-2xl">
        <DialogTitle className="sr-only">Edit post</DialogTitle>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          {platform && (
            <span className="flex h-8 w-8 items-center justify-center rounded-full text-white shrink-0" style={{ backgroundColor: platform.color }}>
              {platform.icon}
            </span>
          )}
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">{channel.username}</p>
            <p className="text-xs text-gray-500">{post.status.charAt(0).toUpperCase() + post.status.slice(1)}</p>
          </div>
        </div>
        <div className="px-5 py-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full min-h-[180px] text-sm text-gray-900 leading-relaxed resize-none focus:outline-none placeholder:text-gray-400"
            placeholder="Write your post..."
          />
          {post.mediaItems && post.mediaItems.length > 0 && (
            <div className="flex gap-2 mt-3">
              {post.mediaItems.map((media, i) => (
                media.type === "video" ? (
                  <video key={i} src={media.url} className="h-20 rounded-lg" controls />
                ) : (
                  <img key={i} src={media.url} alt="" className="h-20 rounded-lg object-cover" />
                )
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end px-5 py-3 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="rounded-lg px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer">
              Cancel
            </button>
            <button onClick={() => onSave({ content })} className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium text-white transition-colors cursor-pointer" style={{ backgroundColor: "#e8614d" }}>
              <PaperPlaneTiltIcon className="h-3.5 w-3.5" />
              Save
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EmptyState({ tab, platformLabel }: { tab: Tab; platformLabel: string }) {
  const config: Record<Tab, { icon: React.ReactNode; title: string; desc: string; cta: string; href: string }> = {
    upcoming: {
      icon: <LightningIcon className="h-6 w-6" style={{ color: "#e8614d" }} weight="fill" />,
      title: "No upcoming posts",
      desc: `Go to the Dashboard to write posts for ${platformLabel}.`,
      cta: "Write my posts",
      href: appRouter.dashboard,
    },
    published: {
      icon: <CheckCircleIcon className="h-6 w-6 text-green-500" />,
      title: "Nothing published yet",
      desc: "Go to the Dashboard to write and publish your first post.",
      cta: "Write my first post",
      href: appRouter.dashboard,
    },
    drafts: {
      icon: <NoteIcon className="h-6 w-6 text-gray-400" />,
      title: "No drafts",
      desc: "When you save a post for later, it shows up here.",
      cta: "Write my posts",
      href: appRouter.dashboard,
    },
    failed: {
      icon: <CheckCircleIcon className="h-6 w-6 text-green-500" />,
      title: "All good!",
      desc: "None of your posts have failed. Keep it up!",
      cta: "",
      href: "",
    },
  };

  const { icon, title, desc, cta, href } = config[tab];

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50 mb-4">
        {icon}
      </div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">{title}</h2>
      <p className="text-sm text-gray-500 mb-6 max-w-xs">{desc}</p>
      {cta && (
        <Link
          href={href}
          className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-colors"
          style={{ backgroundColor: "#e8614d" }}
        >
          <LightningIcon className="h-4 w-4" weight="fill" />
          {cta}
        </Link>
      )}
    </div>
  );
}

function TabButton({ label, active, count, accent, onClick }: { label: string; active: boolean; count?: number; accent?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors cursor-pointer ${active ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
      {label}
      {count !== undefined && count > 0 && (
        <span className={`ml-1.5 text-xs font-normal ${
          active ? "text-gray-300" :
          accent ? "text-red-500" :
          "text-gray-400"
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}
