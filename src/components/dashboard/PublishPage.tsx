"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import useApi from "@/lib/hooks/useApi";
import { appRouter } from "@/lib/constants/appRouter";
import { getPlatform } from "@/lib/constants/platforms";
import ConnectAccountButtons from "./ConnectAccountButtons";
import {
  CalendarIcon,
  CheckCircleIcon,
  SpinnerGapIcon,
  ClockIcon,
  ArrowsClockwiseIcon,
  SquaresFourIcon,
  CaretDownIcon,
  CheckIcon,
} from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  status: string;
  socialAccount: { platform: string; username: string };
}

interface PostItem {
  id: string;
  content: string;
  platforms: { platform: string }[];
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
}

type Tab = "upcoming" | "published";

export default function PublishPage({ channelId }: { channelId?: string }) {
  const searchParams = useSearchParams();
  const channelFilter = channelId ?? searchParams.get("channel");
  const { useGet } = useApi();
  const [activeTab, setActiveTab] = useState<Tab>("upcoming");
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const effectiveChannel = channelFilter ?? selectedChannel;

  // Dashboard status (accounts + analysis status)
  const {
    data: status,
    isLoading: statusLoading,
    refetch: refetchStatus,
  } = useGet("/api/dashboard/status", undefined, { refetchInterval: 3000 });

  const accounts: AccountInfo[] = (status?.accounts ?? []).filter(
    (a: AccountInfo) => a.status === "active"
  );
  const connectedPlatformIds = accounts.map((a: AccountInfo) => a.platform);

  // Find the filtered channel
  const activeChannel = effectiveChannel
    ? accounts.find((a) => a.id === effectiveChannel)
    : null;

  // Check if any account is being analyzed
  const analyzingAccount = activeChannel
    ? activeChannel.analysisStatus !== "completed"
      ? activeChannel
      : null
    : accounts.find(
        (a) =>
          a.analysisStatus === "analyzing" || a.analysisStatus === "pending"
      );

  // Fetch suggestions
  const suggestionsParams = effectiveChannel
    ? { accountId: effectiveChannel }
    : undefined;
  const { data: suggestionsData } = useGet(
    appRouter.api.suggestions,
    suggestionsParams,
    { enabled: !analyzingAccount }
  );
  const suggestions: Suggestion[] = suggestionsData?.suggestions ?? [];

  // Fetch posts
  const postsParams: Record<string, string> = {
    status: activeTab === "upcoming" ? "scheduled" : "published",
    limit: "20",
  };
  if (activeChannel) {
    postsParams.platform = activeChannel.platform;
  }
  const { data: postsData, isLoading: postsLoading } = useGet(
    appRouter.api.posts,
    postsParams,
    { enabled: !analyzingAccount }
  );
  const posts: PostItem[] = postsData?.posts ?? [];

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <SpinnerGapIcon className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  // Header
  const channelLabel = activeChannel
    ? (getPlatform(activeChannel.platform)?.label ?? activeChannel.platform)
    : "Dashboard";

  const isChannelPage = !!channelId;

  const headerWithTabs = (
    <div className="border-b border-gray-200 pb-4 mb-8">
      <div className="flex items-center gap-3 mb-4">
        {activeChannel && (
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full text-white shrink-0"
            style={{ backgroundColor: getPlatform(activeChannel.platform)?.color ?? "#666" }}
          >
            {getPlatform(activeChannel.platform)?.icon}
          </span>
        )}
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight flex-1">
          {channelLabel}
        </h1>
        {activeChannel && !isChannelPage && (
          <p className="text-sm text-gray-500">@{activeChannel.username}</p>
        )}
        {isChannelPage && activeChannel && (
          <p className="text-sm text-gray-500">@{activeChannel.username}</p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <TabButton
            label="Upcoming"
            active={activeTab === "upcoming"}
            count={posts.length}
            onClick={() => setActiveTab("upcoming")}
          />
          <TabButton
            label="Published"
            active={activeTab === "published"}
            onClick={() => setActiveTab("published")}
          />
        </div>

        {/* Channel picker — only on dashboard page, when accounts exist */}
        {!isChannelPage && accounts.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full border border-gray-200 bg-white pl-3 pr-2.5 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">
                {activeChannel ? (
                  <>
                    <span
                      className="flex h-5 w-5 items-center justify-center rounded-full text-white shrink-0"
                      style={{ backgroundColor: getPlatform(activeChannel.platform)?.color ?? "#666" }}
                    >
                      {getPlatform(activeChannel.platform)?.icon}
                    </span>
                    <span className="max-w-[120px] truncate">@{activeChannel.username}</span>
                  </>
                ) : (
                  <>
                    <SquaresFourIcon className="h-4 w-4 text-gray-500" />
                    <span>All channels</span>
                  </>
                )}
                <CaretDownIcon className="h-3.5 w-3.5 text-gray-400 ml-0.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem
                onClick={() => setSelectedChannel(null)}
                className="flex items-center gap-2.5"
              >
                <SquaresFourIcon className="h-4 w-4 text-gray-500" />
                <span className="flex-1">All channels</span>
                {!effectiveChannel && <CheckIcon className="h-4 w-4 text-gray-900" weight="bold" />}
              </DropdownMenuItem>
              {accounts.map((a) => {
                const p = getPlatform(a.platform);
                const isSelected = effectiveChannel === a.id;
                return (
                  <DropdownMenuItem
                    key={a.id}
                    onClick={() => setSelectedChannel(a.id)}
                    className="flex items-center gap-2.5"
                  >
                    <span
                      className="flex h-5 w-5 items-center justify-center rounded-full text-white shrink-0"
                      style={{ backgroundColor: p?.color ?? "#666" }}
                    >
                      {p?.icon}
                    </span>
                    <span className="flex-1 truncate">@{a.username}</span>
                    {isSelected && <CheckIcon className="h-4 w-4 text-gray-900" weight="bold" />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );

  // State 1: No connected accounts
  if (accounts.length === 0) {
    return (
      <div>
        {headerWithTabs}
        <div className="flex flex-col items-center py-12">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl mb-5"
            style={{ backgroundColor: "#fef2f0" }}
          >
            <SquaresFourIcon
              className="h-7 w-7"
              style={{ color: "#e8614d" }}
            />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1.5">
            No channels connected yet
          </h2>
          <p className="text-sm text-gray-500 mb-8 text-center max-w-sm">
            Connect your social accounts and I&apos;ll write your first posts
            for you — ready to publish.
          </p>
          <ConnectAccountButtons
            onAccountConnected={() => refetchStatus()}
            connectedPlatforms={connectedPlatformIds}
          />
        </div>
      </div>
    );
  }

  // State 2: Account is being analyzed
  if (analyzingAccount) {
    const platform = getPlatform(analyzingAccount.platform);
    return (
      <div>
        {headerWithTabs}
        <div className="flex flex-col items-center justify-center py-20">
          <AnalysisLoader
            platformLabel={platform?.label ?? analyzingAccount.platform}
          />
        </div>
      </div>
    );
  }

  // State 3: Has suggestions to show (first time after analysis)
  if (suggestions.length > 0 && posts.length === 0) {
    return (
      <div>
        {headerWithTabs}
        <div className="mb-6">
          <h2 className="text-base font-semibold text-gray-900">
            Your posts are ready
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Here are post ideas based on your business. Schedule the ones you
            like.
          </p>
        </div>
        <div className="space-y-3 max-w-3xl">
          {suggestions.map((s) => (
            <SuggestionCard key={s.id} suggestion={s} />
          ))}
        </div>
      </div>
    );
  }

  // State 4: Normal — Upcoming / Published
  return (
    <div>
      {headerWithTabs}

      {suggestions.length > 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 max-w-3xl">
          <p className="text-sm font-medium text-amber-900">
            You have {suggestions.length} post suggestion
            {suggestions.length > 1 ? "s" : ""} ready to review
          </p>
        </div>
      )}

      {postsLoading ? (
        <div className="flex items-center justify-center h-32">
          <SpinnerGapIcon className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      ) : posts.length === 0 ? (
        <EmptyState tab={activeTab} />
      ) : (
        <div className="space-y-3 max-w-3xl">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}

// --- Sub-components ---

function AnalysisLoader({ platformLabel }: { platformLabel: string }) {
  const [messageIndex, setMessageIndex] = useState(0);
  const messages = [
    `${platformLabel} connected`,
    "Looking at your recent posts...",
    "Understanding your tone of voice...",
    "Writing your posts for the week...",
  ];

  useEffect(() => {
    const timers = [
      setTimeout(() => setMessageIndex(1), 1500),
      setTimeout(() => setMessageIndex(2), 4000),
      setTimeout(() => setMessageIndex(3), 7000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="space-y-4 w-full max-w-sm">
      {messages.map((msg, i) => (
        <div key={i} className="flex items-center gap-3 text-left">
          {i < messageIndex ? (
            <CheckCircleIcon
              className="h-5 w-5 shrink-0"
              style={{ color: "#e8614d" }}
              weight="fill"
            />
          ) : i === messageIndex ? (
            <SpinnerGapIcon className="h-5 w-5 shrink-0 animate-spin text-gray-400" />
          ) : (
            <div className="h-5 w-5 shrink-0 rounded-full border-2 border-gray-200" />
          )}
          <span
            className={`text-sm ${i <= messageIndex ? "text-gray-900 font-medium" : "text-gray-400"}`}
          >
            {msg}
          </span>
        </div>
      ))}
    </div>
  );
}

function SuggestionCard({ suggestion }: { suggestion: Suggestion }) {
  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  const scheduledTime = `${days[suggestion.suggestedDay]} at ${suggestion.suggestedHour}:00`;
  const platform = getPlatform(suggestion.socialAccount.platform);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-start gap-3 mb-3">
        {platform && (
          <span
            className="flex h-6 w-6 items-center justify-center rounded-lg text-white shrink-0 mt-0.5"
            style={{ backgroundColor: platform.color }}
          >
            {platform.icon}
          </span>
        )}
        <p className="text-sm text-gray-900 whitespace-pre-wrap flex-1">
          {suggestion.content}
        </p>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <ClockIcon className="h-3.5 w-3.5" />
            {scheduledTime}
          </span>
          <span className="capitalize">{suggestion.contentType}</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Edit
          </button>
          <button
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors"
            style={{ backgroundColor: "#e8614d" }}
          >
            Schedule
          </button>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  label,
  active,
  count,
  onClick,
}: {
  label: string;
  active: boolean;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
        active
          ? "bg-gray-900 text-white"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className={`ml-1.5 text-xs font-normal ${active ? "text-gray-300" : "text-gray-400"}`}>
          {count}
        </span>
      )}
    </button>
  );
}

function PostCard({ post }: { post: PostItem }) {
  const platform = post.platforms[0]
    ? getPlatform(post.platforms[0].platform)
    : null;
  const time = post.scheduledAt ?? post.publishedAt ?? post.createdAt;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-start gap-3">
        {platform && (
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg text-white shrink-0 mt-0.5"
            style={{ backgroundColor: platform.color }}
          >
            {platform.icon}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900 line-clamp-3">{post.content}</p>
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
            <CalendarIcon className="h-3.5 w-3.5" />
            {new Date(time).toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
            <span
              className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                post.status === "published"
                  ? "bg-green-50 text-green-700"
                  : post.status === "scheduled"
                    ? "bg-blue-50 text-blue-700"
                    : post.status === "failed"
                      ? "bg-red-50 text-red-700"
                      : "bg-gray-50 text-gray-600"
              }`}
            >
              {post.status}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  if (tab === "published") {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 text-sm">No published posts yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50 mb-4">
        <ArrowsClockwiseIcon className="h-6 w-6 text-gray-400" />
      </div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">
        Your queue is empty
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        Want me to write your posts for the week?
      </p>
      <button
        className="rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-colors"
        style={{ backgroundColor: "#e8614d" }}
      >
        Write my posts
      </button>
    </div>
  );
}
