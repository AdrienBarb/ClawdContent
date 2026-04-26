"use client";

import { useState, useRef, useCallback } from "react";
import { useQueryState } from "nuqs";
import toast from "react-hot-toast";
import useApi from "@/lib/hooks/useApi";
import { useDashboardStatus } from "@/lib/hooks/useDashboardStatus";
import { appRouter } from "@/lib/constants/appRouter";
import { getPlatform } from "@/lib/constants/platforms";
import ConnectAccountButtons from "./ConnectAccountButtons";
import {
  SpinnerGapIcon,
  ArrowsClockwiseIcon,
  CaretDownIcon,
  CheckIcon,
  PencilSimpleIcon,
  ImageIcon,
  PaperPlaneTiltIcon,
  TrashIcon,
  LightningIcon,
  TextAaIcon,
  HashIcon,
  ArrowsOutIcon,
  ArrowsInIcon,
  SuitcaseIcon,
  PlusIcon,
  CalendarIcon,
  XIcon,
  CaretLeftIcon,
  CaretRightIcon,
  ShieldCheckIcon,
  LockKeyIcon,
  SignOutIcon,
} from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import MediaUploadModal from "./MediaUploadModal";
import SubscribeModal from "./SubscribeModal";

interface AccountInfo {
  id: string;
  platform: string;
  username: string;
  status: string;
  analysisStatus: string;
  lastAnalyzedAt: string | null;
}

interface Suggestion {
  id: string;
  content: string;
  contentType: string;
  suggestedDay: number;
  suggestedHour: number;
  reasoning: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
  status: string;
  socialAccount: { platform: string; username: string };
}

export default function PublishPage() {
  const { useGet } = useApi();
  const [selectedAccountId, setSelectedAccountId] = useQueryState("account");
  const [editingItem, setEditingItem] = useState<Suggestion | null>(null);
  const [generating, setGenerating] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);

  // Dashboard status (shared hook — polls only while an account is analyzing)
  const {
    data: status,
    isLoading: statusLoading,
    refetch: refetchStatus,
  } = useDashboardStatus();

  const accounts: AccountInfo[] = (status?.accounts ?? []).filter(
    (a: AccountInfo) => a.status === "active"
  );
  const connectedPlatformIds = accounts.map((a: AccountInfo) => a.platform);

  // Default to first account
  const activeAccountId = selectedAccountId ?? accounts[0]?.id ?? null;
  const activeAccount = accounts.find((a) => a.id === activeAccountId) ?? null;

  // Subscription + post limit
  const hasSubscription = status?.subscription?.status === "active" || status?.subscription?.status === "trialing";
  const postsPublished: number = status?.postsPublished ?? 0;
  const freePostLimit: number = status?.freePostLimit ?? 5;
  const freePostsRemaining = Math.max(0, freePostLimit - postsPublished);
  const isPostLimitReached = !hasSubscription && postsPublished >= freePostLimit;

  const guardPost = async (action: () => Promise<void>) => {
    if (isPostLimitReached) {
      setShowSubscribeModal(true);
    } else {
      await action();
    }
  };

  // Fetch suggestions — keyed on analysisStatus so TanStack Query
  // automatically refetches when analysis completes (no useEffect needed)
  const { data: suggestionsData, refetch: refetchSuggestions } = useGet(
    appRouter.api.suggestions,
    activeAccountId ? { accountId: activeAccountId, _analysisStatus: activeAccount?.analysisStatus } : undefined,
    { enabled: !!activeAccountId }
  );
  const suggestions: Suggestion[] = suggestionsData?.suggestions ?? [];

  // Generate posts for active account
  const handleGenerate = async (topic?: string) => {
    setGenerating(true);
    setShowGenerateModal(false);
    try {
      await fetch(appRouter.api.suggestionsGenerate, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(topic ? { topic } : {}),
          ...(activeAccountId ? { accountId: activeAccountId } : {}),
        }),
      });
      refetchSuggestions();
    } finally {
      setGenerating(false);
    }
  };

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <SpinnerGapIcon className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  // No connected accounts
  if (accounts.length === 0) {
    return (
      <div>
        <Header
          accounts={accounts}
          activeAccountId={activeAccountId}
          onSelectAccount={setSelectedAccountId}
        />
        <div className="flex flex-col items-center py-12">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl mb-5"
            style={{ backgroundColor: "#fef2f0" }}
          >
            <ShieldCheckIcon className="h-7 w-7" style={{ color: "#e8614d" }} weight="duotone" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1.5">
            Connect your first account to get started
          </h2>
          <p className="text-sm text-gray-500 mb-8 text-center max-w-sm">
            We&apos;ll draft posts for your business — you decide what goes live.
          </p>
          <ConnectAccountButtons
            onAccountConnected={() => refetchStatus()}
            connectedPlatforms={connectedPlatformIds}
          />
          <div className="mt-6 flex items-center justify-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1.5">
              <LockKeyIcon className="h-3.5 w-3.5" />
              Secure connection
            </span>
            <span className="text-gray-200">·</span>
            <span className="flex items-center gap-1.5">
              <SignOutIcon className="h-3.5 w-3.5" />
              Disconnect anytime
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Main post maker view
  return (
    <div>
      <Header
        accounts={accounts}
        activeAccountId={activeAccountId}
        onSelectAccount={setSelectedAccountId}
        onGetIdeas={() => setShowGenerateModal(true)}
        onNewPost={() => setShowComposeModal(true)}
        generating={generating}
        analyzing={activeAccount?.analysisStatus === "analyzing"}
      />

      {/* Account analysis in progress */}
      {activeAccount?.analysisStatus === "analyzing" && (
        <div className="flex flex-col items-center justify-center py-20">
          <SpinnerGapIcon className="h-8 w-8 animate-spin text-gray-400 mb-4" />
          <p className="text-sm font-medium text-gray-900">Analyzing your account...</p>
          <p className="text-xs text-gray-500 mt-1">We&apos;re looking at your content to write better posts for you</p>
        </div>
      )}

      {/* Generating state */}
      {activeAccount?.analysisStatus !== "analyzing" && generating && (
        <div className="flex flex-col items-center justify-center py-20">
          <SpinnerGapIcon className="h-8 w-8 animate-spin text-gray-400 mb-4" />
          <p className="text-sm font-medium text-gray-900">Writing your posts...</p>
          <p className="text-xs text-gray-500 mt-1">This takes about 15 seconds</p>
        </div>
      )}

      {/* Empty state */}
      {activeAccount?.analysisStatus !== "analyzing" && !generating && suggestions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50 mb-4">
            <ArrowsClockwiseIcon className="h-6 w-6 text-gray-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            No posts yet
          </h2>
          <p className="text-sm text-gray-500 mb-6 max-w-xs">
            Get post ideas and I&apos;ll write them for you, or create your own post.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowGenerateModal(true)}
              className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-colors cursor-pointer"
              style={{ backgroundColor: "#e8614d" }}
            >
              <LightningIcon className="h-4 w-4" weight="fill" />
              Get ideas
            </button>
            <button
              onClick={() => setShowComposeModal(true)}
              className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <PlusIcon className="h-4 w-4" />
              New post
            </button>
          </div>
        </div>
      )}

      {/* Suggestions list */}
      {activeAccount?.analysisStatus !== "analyzing" && !generating && suggestions.length > 0 && (
        <>
        <div className="max-w-3xl mx-auto mb-6 flex items-start gap-3 rounded-xl bg-gray-50 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-full shrink-0 mt-0.5" style={{ backgroundColor: "#fef2f0" }}>
            <LightningIcon className="h-4.5 w-4.5" weight="fill" style={{ color: "#e8614d" }} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">
              {suggestions.length} post ideas for your {getPlatform(activeAccount?.platform ?? "")?.label ?? "account"}
            </p>
            <p className="text-sm text-gray-500 mt-0.5">
              Edit, schedule, or post them right away. <button onClick={() => setShowGenerateModal(true)} className="text-[#e8614d] font-medium hover:underline cursor-pointer">Get ideas</button> to refresh.
            </p>
          </div>
        </div>
        <SuggestionList
          suggestions={suggestions}
          onEdit={setEditingItem}
          onSchedule={async (id, scheduledAt) => {
            await guardPost(async () => {
              const res = await fetch(`/api/suggestions/${id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ scheduledAt }),
              });
              if (!res.ok) {
                const data = await res.json().catch(() => null);
                if (data?.error === "FREE_POST_LIMIT_REACHED") { setShowSubscribeModal(true); return; }
                if (data?.error === "VALIDATION_FAILED" && data.validationErrors) {
                  for (const e of data.validationErrors) toast.error(`${e.platform}: ${e.error}`);
                } else {
                  toast.error("Failed to schedule post");
                }
                return;
              }
              toast.success("Post scheduled");
              refetchSuggestions();
              refetchStatus();
            });
          }}
          onAction={async (action, suggestion) => {
            if (action === "publish") {
              await guardPost(async () => {
                const res = await fetch(`/api/suggestions/${suggestion.id}`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "publish" }),
                });
                if (!res.ok) {
                  const data = await res.json().catch(() => null);
                  if (data?.error === "FREE_POST_LIMIT_REACHED") { setShowSubscribeModal(true); return; }
                  if (data?.error === "VALIDATION_FAILED" && data.validationErrors) {
                    for (const e of data.validationErrors) toast.error(`${e.platform}: ${e.error}`);
                  } else {
                    toast.error("Failed to publish post");
                  }
                  return;
                }
                toast.success("Post published");
                refetchSuggestions();
                refetchStatus();
              });
            } else if (action === "delete") {
              await fetch(`/api/suggestions/${suggestion.id}`, { method: "DELETE" });
              toast.success("Post deleted");
              refetchSuggestions();
            }
          }}
        />
        </>
      )}

      {/* Edit suggestion modal (AI-generated posts) */}
      {editingItem && (
        <EditModal
          suggestion={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={async (updated) => {
            await fetch(`/api/suggestions/${editingItem.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(updated),
            });
            refetchSuggestions();
            setEditingItem(null);
          }}
        />
      )}

      {/* Generate modal (Get ideas) */}
      {showGenerateModal && (
        <GenerateModal
          onClose={() => setShowGenerateModal(false)}
          onGenerate={(topic) => handleGenerate(topic || undefined)}
        />
      )}

      {/* Compose modal (New post — goes directly to Zernio) */}
      {showComposeModal && (
        <ComposeModal
          accounts={accounts}
          defaultAccountId={activeAccountId ?? accounts[0]?.id}
          onClose={() => { setShowComposeModal(false); refetchStatus(); }}
          onPostLimitReached={() => { setShowComposeModal(false); setShowSubscribeModal(true); }}
        />
      )}

      {/* Free post usage counter */}
      {!hasSubscription && accounts.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-6 z-30">
          <div className="flex items-center gap-3 rounded-full bg-white border border-gray-200 shadow-lg px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500">{postsPublished}/{freePostLimit} free posts used</span>
              <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (postsPublished / freePostLimit) * 100)}%`,
                    backgroundColor: isPostLimitReached ? "#ef4444" : "#e8614d",
                  }}
                />
              </div>
            </div>
            {isPostLimitReached && (
              <button
                onClick={() => setShowSubscribeModal(true)}
                className="text-xs font-medium text-white rounded-full px-3 py-1 cursor-pointer"
                style={{ backgroundColor: "#e8614d" }}
              >
                Subscribe
              </button>
            )}
          </div>
        </div>
      )}

      {/* Subscribe modal */}
      <SubscribeModal open={showSubscribeModal} onOpenChange={setShowSubscribeModal} />
    </div>
  );
}

// --- Header ---

function Header({
  accounts,
  activeAccountId,
  onSelectAccount,
  onGetIdeas,
  onNewPost,
  generating,
  analyzing,
}: {
  accounts: AccountInfo[];
  activeAccountId: string | null;
  onSelectAccount: (id: string | null) => void;
  onGetIdeas?: () => void;
  onNewPost?: () => void;
  generating?: boolean;
  analyzing?: boolean;
}) {
  const buttonsDisabled = generating || analyzing;
  return (
    <div className="sticky top-0 z-20 bg-white border-b border-gray-200 pb-0 mb-8 -mx-8 px-8 pt-6 -mt-6 md:rounded-t-2xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
          Posts
        </h1>
        {onGetIdeas && (
          <div className="flex items-center gap-2">
            <button
              onClick={onGetIdeas}
              disabled={buttonsDisabled}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: "#e8614d" }}
            >
              {generating ? (
                <SpinnerGapIcon className="h-4 w-4 animate-spin" />
              ) : (
                <LightningIcon className="h-4 w-4" weight="fill" />
              )}
              Get ideas
            </button>
            {onNewPost && (
              <button
                onClick={onNewPost}
                disabled={buttonsDisabled}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                <PlusIcon className="h-4 w-4" />
                New post
              </button>
            )}
          </div>
        )}
      </div>

      {/* Account tabs */}
      {accounts.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-4">
          {accounts.map((a) => {
            const p = getPlatform(a.platform);
            const isActive = activeAccountId === a.id;
            return (
              <button
                key={a.id}
                onClick={() => onSelectAccount(a.id)}
                className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors cursor-pointer shrink-0 ${
                  isActive
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {p && (
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full shrink-0 ${isActive ? "text-white" : "text-white"}`}
                    style={{ backgroundColor: isActive ? "rgba(255,255,255,0.2)" : p.color }}
                  >
                    {p.icon}
                  </span>
                )}
                <span className="max-w-[120px] truncate">{a.username}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- Suggestion List ---

function SuggestionList({
  suggestions,
  onEdit,
  onSchedule,
  onAction,
}: {
  suggestions: Suggestion[];
  onEdit: (s: Suggestion) => void;
  onSchedule: (id: string, scheduledAt: string) => Promise<void>;
  onAction: (action: string, s: Suggestion) => Promise<void>;
}) {
  // Track which suggestion is busy and what action is running
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const handleAction = async (action: string, suggestion: Suggestion) => {
    setBusyId(suggestion.id);
    setBusyAction(action);
    try {
      await onAction(action, suggestion);
    } finally {
      setBusyId(null);
      setBusyAction(null);
    }
  };

  const handleSchedule = async (id: string, scheduledAt: string) => {
    setBusyId(id);
    setBusyAction("schedule");
    try {
      await onSchedule(id, scheduledAt);
    } finally {
      setBusyId(null);
      setBusyAction(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {suggestions.map((suggestion) => {
        const p = getPlatform(suggestion.socialAccount.platform);
        const isBusy = busyId === suggestion.id;
        const isPublishing = isBusy && busyAction === "publish";
        const isScheduling = isBusy && busyAction === "schedule";
        const isDeleting = isBusy && busyAction === "delete";

        return (
          <div key={suggestion.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2.5">
                {p && (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full text-white shrink-0" style={{ backgroundColor: p.color }}>
                    {p.icon}
                  </span>
                )}
                <span className="text-sm font-medium text-gray-900">
                  {suggestion.socialAccount.username}
                </span>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {suggestion.content}
              </p>
              {suggestion.mediaUrl && (
                <div className="mt-3">
                  {suggestion.mediaType === "video" ? (
                    <video src={suggestion.mediaUrl} className="h-32 rounded-lg" controls />
                  ) : (
                    <img src={suggestion.mediaUrl} alt="" className="h-32 rounded-lg object-cover" />
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center justify-end border-t border-gray-100 px-4 py-2.5">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleAction("delete", suggestion)}
                  disabled={isBusy}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-red-400 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isDeleting ? <SpinnerGapIcon className="h-3.5 w-3.5 animate-spin" /> : <TrashIcon className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={() => onEdit(suggestion)}
                  disabled={isBusy}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <PencilSimpleIcon className="h-3.5 w-3.5" />
                </button>
                <SchedulePicker
                  disabled={isBusy}
                  onSchedule={(date) => handleSchedule(suggestion.id, date.toISOString())}
                />
                <button
                  onClick={() => handleAction("publish", suggestion)}
                  disabled={isBusy}
                  className="flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-white transition-colors cursor-pointer disabled:opacity-50"
                  style={{ backgroundColor: "#e8614d" }}
                >
                  {isPublishing ? <SpinnerGapIcon className="h-3.5 w-3.5 animate-spin" /> : <PaperPlaneTiltIcon className="h-3.5 w-3.5" />}
                  {isPublishing ? "Posting..." : "Post now"}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --- Edit Modal (for AI-generated suggestions) ---

function EditModal({
  suggestion,
  onClose,
  onSave,
}: {
  suggestion: Suggestion;
  onClose: () => void;
  onSave: (updated: { content: string; mediaUrl?: string; mediaType?: string }) => void;
}) {
  const [content, setContent] = useState(suggestion.content);
  const [mediaUrl, setMediaUrl] = useState<string | null>(suggestion.mediaUrl);
  const [mediaType, setMediaType] = useState<string | null>(suggestion.mediaType);
  const [rewriting, setRewriting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const platform = getPlatform(suggestion.socialAccount.platform);

  const handleRewrite = async (instruction: string) => {
    if (!content.trim()) return;
    setRewriting(true);
    try {
      await fetch(`/api/suggestions/${suggestion.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const res = await fetch(`/api/suggestions/${suggestion.id}/rewrite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction }),
      });
      const data = await res.json();
      if (data.content) setContent(data.content);
    } finally {
      setRewriting(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "postclaw_unsigned");
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`,
        { method: "POST", body: formData }
      );
      const data = await res.json();
      setMediaUrl(data.secure_url);
      setMediaType(data.resource_type === "video" ? "video" : "image");
    } finally {
      setUploading(false);
      if (editFileInputRef.current) editFileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden rounded-2xl">
        <DialogTitle className="sr-only">Edit post</DialogTitle>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          {platform && (
            <span className="flex h-8 w-8 items-center justify-center rounded-full text-white shrink-0" style={{ backgroundColor: platform.color }}>
              {platform.icon}
            </span>
          )}
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">{suggestion.socialAccount.username}</p>
            <p className="text-xs text-gray-500">Post idea</p>
          </div>
        </div>

        {/* Content */}
        <div className="px-5 py-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full min-h-[180px] text-sm text-gray-900 leading-relaxed resize-none focus:outline-none placeholder:text-gray-400"
            placeholder="Write your post..."
          />
          {mediaUrl && (
            <div className="mt-3 relative inline-block">
              {mediaType === "video" ? (
                <video src={mediaUrl} className="h-24 rounded-lg" controls />
              ) : (
                <img src={mediaUrl} alt="" className="h-24 w-24 rounded-lg object-cover" />
              )}
              <button
                onClick={() => { setMediaUrl(null); setMediaType(null); }}
                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-gray-900 text-white flex items-center justify-center cursor-pointer"
              >
                <XIcon className="h-3 w-3" weight="bold" />
              </button>
            </div>
          )}
        </div>

        {/* AI assist buttons */}
        <div className="flex items-center gap-1.5 px-5 py-3 border-t border-gray-100 overflow-x-auto">
          <LightningIcon className="h-4 w-4 text-gray-400 shrink-0" weight="fill" />
          {[
            { key: "fix", label: "Fix", icon: <CheckIcon className="h-3.5 w-3.5" /> },
            { key: "rewrite", label: "Rewrite", icon: <ArrowsClockwiseIcon className="h-3.5 w-3.5" /> },
            { key: "shorter", label: "Shorter", icon: <ArrowsInIcon className="h-3.5 w-3.5" /> },
            { key: "longer", label: "Longer", icon: <ArrowsOutIcon className="h-3.5 w-3.5" /> },
            { key: "hashtags", label: "Hashtags", icon: <HashIcon className="h-3.5 w-3.5" /> },
            { key: "casual", label: "Casual", icon: <TextAaIcon className="h-3.5 w-3.5" /> },
            { key: "professional", label: "Pro", icon: <SuitcaseIcon className="h-3.5 w-3.5" /> },
          ].map((btn) => (
            <button
              key={btn.key}
              onClick={() => handleRewrite(btn.key)}
              disabled={!content.trim() || rewriting}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
            >
              {btn.icon}
              {btn.label}
            </button>
          ))}
          {rewriting && <SpinnerGapIcon className="h-4 w-4 animate-spin text-gray-400 shrink-0 ml-1" />}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={() => editFileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            {uploading ? (
              <SpinnerGapIcon className="h-4 w-4 animate-spin" />
            ) : (
              <ImageIcon className="h-4 w-4" />
            )}
            {uploading ? "Uploading..." : "Add photo"}
          </button>
          <input
            ref={editFileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSave({ content, mediaUrl: mediaUrl ?? undefined, mediaType: mediaType ?? undefined })}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium text-white transition-colors cursor-pointer"
              style={{ backgroundColor: "#e8614d" }}
            >
              <PencilSimpleIcon className="h-3.5 w-3.5" />
              Edit
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --- Compose Modal (New post — goes directly to Zernio) ---

function ComposeModal({
  accounts,
  defaultAccountId,
  onClose,
  onPostLimitReached,
}: {
  accounts: AccountInfo[];
  defaultAccountId: string;
  onClose: () => void;
  onPostLimitReached?: () => void;
}) {
  const [content, setContent] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState(defaultAccountId);
  const [mediaItems, setMediaItems] = useState<{ url: string; type: string }[]>([]);
  const [posting, setPosting] = useState(false);
  const [rewriting, setRewriting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
  const platform = selectedAccount ? getPlatform(selectedAccount.platform) : null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", "postclaw_unsigned");
        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`,
          { method: "POST", body: formData }
        );
        const data = await res.json();
        setMediaItems((prev) => [...prev, {
          url: data.secure_url,
          type: data.resource_type === "video" ? "video" : "image",
        }]);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeMedia = (index: number) => {
    setMediaItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRewrite = async (instruction: string) => {
    if (!content.trim()) return;
    setRewriting(true);
    try {
      const res = await fetch("/api/posts/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          platform: selectedAccount?.platform ?? "instagram",
          instruction,
        }),
      });
      const data = await res.json();
      if (data.content) setContent(data.content);
    } finally {
      setRewriting(false);
    }
  };

  const handlePost = async (action: "publish" | "schedule", scheduledAt?: string) => {
    if (!content.trim()) return;
    setPosting(true);
    try {
      const res = await fetch(appRouter.api.postsCompose, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          accountId: selectedAccountId,
          action,
          ...(scheduledAt ? { scheduledAt } : {}),
          ...(mediaItems.length > 0 ? { mediaItems } : {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.error === "FREE_POST_LIMIT_REACHED") {
          onPostLimitReached?.();
          return;
        }
        if (data?.error === "VALIDATION_FAILED" && data.validationErrors) {
          for (const e of data.validationErrors) toast.error(`${e.platform}: ${e.error}`);
        } else {
          toast.error(action === "publish" ? "Failed to publish post" : "Failed to schedule post");
        }
        return;
      }
      toast.success(action === "publish" ? "Post published" : "Post scheduled");
      onClose();
    } finally {
      setPosting(false);
    }
  };

  return (
    <>
      <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden rounded-2xl">
          <DialogTitle className="sr-only">New post</DialogTitle>

          {/* Account selector */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2.5 hover:bg-gray-50 rounded-lg px-2 py-1.5 -ml-2 transition-colors cursor-pointer">
                  {platform && (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full text-white shrink-0" style={{ backgroundColor: platform.color }}>
                      {platform.icon}
                    </span>
                  )}
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900">{selectedAccount?.username}</p>
                    <p className="text-xs text-gray-500">{platform?.label}</p>
                  </div>
                  <CaretDownIcon className="h-3.5 w-3.5 text-gray-400 ml-1" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {accounts.map((a) => {
                  const ap = getPlatform(a.platform);
                  return (
                    <DropdownMenuItem
                      key={a.id}
                      onClick={() => setSelectedAccountId(a.id)}
                      className="flex items-center gap-2.5"
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded-full text-white shrink-0" style={{ backgroundColor: ap?.color ?? "#666" }}>
                        {ap?.icon}
                      </span>
                      <span className="flex-1 truncate">@{a.username}</span>
                      {selectedAccountId === a.id && <CheckIcon className="h-4 w-4 text-gray-900" weight="bold" />}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Content */}
          <div className="px-5 py-4">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full min-h-[180px] text-sm text-gray-900 leading-relaxed resize-none focus:outline-none placeholder:text-gray-400"
              placeholder="What do you want to share?"
              autoFocus
            />
            {mediaItems.length > 0 && (
              <div className="mt-3 flex gap-2 flex-wrap">
                {mediaItems.map((item, i) => (
                  <div key={i} className="relative">
                    {item.type === "video" ? (
                      <video src={item.url} className="h-24 rounded-lg" controls />
                    ) : (
                      <img src={item.url} alt="" className="h-24 w-24 rounded-lg object-cover" />
                    )}
                    <button
                      onClick={() => removeMedia(i)}
                      className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-gray-900 text-white flex items-center justify-center cursor-pointer"
                    >
                      <XIcon className="h-3 w-3" weight="bold" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI assist buttons */}
          <div className="flex items-center gap-1.5 px-5 py-3 border-t border-gray-100 overflow-x-auto">
            <LightningIcon className="h-4 w-4 text-gray-400 shrink-0" weight="fill" />
            {[
              { key: "fix", label: "Fix", icon: <CheckIcon className="h-3.5 w-3.5" /> },
              { key: "rewrite", label: "Rewrite", icon: <ArrowsClockwiseIcon className="h-3.5 w-3.5" /> },
              { key: "shorter", label: "Shorter", icon: <ArrowsInIcon className="h-3.5 w-3.5" /> },
              { key: "longer", label: "Longer", icon: <ArrowsOutIcon className="h-3.5 w-3.5" /> },
              { key: "hashtags", label: "Hashtags", icon: <HashIcon className="h-3.5 w-3.5" /> },
              { key: "casual", label: "Casual", icon: <TextAaIcon className="h-3.5 w-3.5" /> },
              { key: "professional", label: "Pro", icon: <SuitcaseIcon className="h-3.5 w-3.5" /> },
            ].map((btn) => (
              <button
                key={btn.key}
                onClick={() => handleRewrite(btn.key)}
                disabled={!content.trim() || rewriting}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
              >
                {btn.icon}
                {btn.label}
              </button>
            ))}
            {rewriting && <SpinnerGapIcon className="h-4 w-4 animate-spin text-gray-400 shrink-0 ml-1" />}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50"
            >
              {uploading ? (
                <SpinnerGapIcon className="h-4 w-4 animate-spin" />
              ) : (
                <ImageIcon className="h-4 w-4" />
              )}
              {uploading ? "Uploading..." : "Add photo"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="flex items-center gap-2">
              <SchedulePicker
                disabled={!content.trim() || posting}
                onSchedule={(date) => handlePost("schedule", date.toISOString())}
              />
              <button
                onClick={() => handlePost("publish")}
                disabled={!content.trim() || posting}
                className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium text-white transition-colors cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: "#e8614d" }}
              >
                {posting ? (
                  <SpinnerGapIcon className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <PaperPlaneTiltIcon className="h-3.5 w-3.5" />
                )}
                Post now
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// --- Time Slot Picker (horizontal scroll with arrows) ---

function TimeSlotPicker({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (time: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction === "left" ? -150 : 150, behavior: "smooth" });
    setTimeout(updateScrollState, 300);
  };

  return (
    <div className="border-t border-gray-100 py-3">
      <div className="flex items-center justify-between px-4 mb-2">
        <p className="text-xs font-medium text-gray-500">Time</p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
            className="flex h-6 w-6 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-30"
          >
            <CaretLeftIcon className="h-3.5 w-3.5" weight="bold" />
          </button>
          <button
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
            className="flex h-6 w-6 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-30"
          >
            <CaretRightIcon className="h-3.5 w-3.5" weight="bold" />
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        onScroll={updateScrollState}
        className="flex gap-1.5 px-4 overflow-x-auto"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {TIME_SLOTS.map((t) => (
          <button
            key={t}
            onClick={() => onSelect(t)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
              selected === t
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {formatTimeLabel(t)}
          </button>
        ))}
      </div>
    </div>
  );
}

// --- Schedule Picker ---

const TIME_SLOTS = [
  "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00",
  "18:00", "19:00", "20:00", "21:00",
];

function formatTimeLabel(t: string) {
  const [h, m] = t.split(":").map(Number);
  const hour = h % 12 || 12;
  const ampm = h < 12 ? "AM" : "PM";
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function SchedulePicker({
  disabled,
  onSchedule,
  variant = "outline",
}: {
  disabled: boolean;
  onSchedule: (date: Date) => void;
  variant?: "outline" | "primary";
}) {
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState("10:00");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const handleConfirm = () => {
    if (!selectedDate) return;
    const date = new Date(selectedDate);
    const [h, m] = selectedTime.split(":").map(Number);
    date.setHours(h, m, 0, 0);
    onSchedule(date);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          disabled={disabled}
          className={`flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 ${
            variant === "primary"
              ? "text-white"
              : "text-gray-700 border border-gray-200 hover:bg-gray-50"
          }`}
          style={variant === "primary" ? { backgroundColor: "#e8614d" } : undefined}
        >
          <CalendarIcon className="h-3.5 w-3.5" />
          Schedule
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] p-0 rounded-2xl z-[70]" sideOffset={8}>
        <div className="overflow-hidden rounded-t-2xl">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            disabled={{ before: today }}
            className="p-4 [--cell-size:2.75rem]"
          />
        </div>

        {/* Time slots */}
        <TimeSlotPicker selected={selectedTime} onSelect={setSelectedTime} />

        {/* Confirm */}
        <div className="px-4 py-3 border-t border-gray-100">
          <button
            onClick={handleConfirm}
            disabled={!selectedDate}
            className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-colors cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: "#e8614d" }}
          >
            <CalendarIcon className="h-4 w-4" />
            {selectedDate
              ? `Schedule for ${selectedDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })} at ${formatTimeLabel(selectedTime)}`
              : "Pick a date"}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// --- Generate Modal (Get ideas) ---

function GenerateModal({
  onClose,
  onGenerate,
}: {
  onClose: () => void;
  onGenerate: (topic: string) => void;
}) {
  const [topic, setTopic] = useState("");

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden rounded-2xl">
        <DialogTitle className="sr-only">Get post ideas</DialogTitle>
        <div className="px-5 py-4">
          <h3 className="text-base font-semibold text-gray-900 mb-1">Get post ideas</h3>
          <p className="text-sm text-gray-500 mb-4">
            Anything specific? Leave empty and I&apos;ll come up with ideas based on your business.
          </p>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full min-h-[100px] text-sm text-gray-900 leading-relaxed resize-none border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[#e8614d]/20 focus:border-[#e8614d] placeholder:text-gray-400"
            placeholder="e.g. We just catered a wedding at the Ritz, or We're launching a new summer menu..."
            autoFocus
          />
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={() => onGenerate(topic)}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium text-white transition-colors cursor-pointer"
            style={{ backgroundColor: "#e8614d" }}
          >
            <LightningIcon className="h-3.5 w-3.5" weight="fill" />
            Write my posts
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
