import { Fragment, useState } from "react";
import {
  ArrowLeftIcon,
  PencilSimpleIcon,
  TrashIcon,
  SpinnerGapIcon,
  PaperPlaneTiltIcon,
} from "@phosphor-icons/react";
import { getPlatform } from "@/lib/constants/platforms";
import { SchedulePicker } from "../SchedulePicker";
import type { Suggestion } from "./types";

interface PlatformGroup {
  account: { id: string; platform: string; username: string };
  posts: Suggestion[];
}

function groupByAccount(
  suggestions: Suggestion[],
  accounts: { id: string; platform: string; username: string }[]
): PlatformGroup[] {
  // Group by socialAccount.username + platform (suggestions don't carry accountId in client shape)
  const byKey = new Map<string, Suggestion[]>();
  for (const s of suggestions) {
    const key = `${s.socialAccount.platform}|${s.socialAccount.username}`;
    const existing = byKey.get(key) ?? [];
    existing.push(s);
    byKey.set(key, existing);
  }
  // Map back to account objects, preserving accounts order
  const groups: PlatformGroup[] = [];
  for (const account of accounts) {
    const key = `${account.platform}|${account.username}`;
    const posts = byKey.get(key);
    if (posts && posts.length > 0) {
      groups.push({ account, posts });
    }
  }
  return groups;
}

export function ResultsView({
  accounts,
  suggestions,
  onBack,
  onEdit,
  onSchedule,
  onAction,
}: {
  accounts: { id: string; platform: string; username: string }[];
  suggestions: Suggestion[];
  onBack: () => void;
  onEdit: (s: Suggestion) => void;
  onSchedule: (id: string, scheduledAt: string) => Promise<void>;
  onAction: (action: string, s: Suggestion) => Promise<void>;
}) {
  const grouped = groupByAccount(suggestions, accounts);
  const total = suggestions.length;

  return (
    <div className="flex flex-col">
      <div className="relative h-12 flex items-center">
        <button
          type="button"
          onClick={onBack}
          className="absolute left-0 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors cursor-pointer rounded-lg px-2 py-1 -ml-2"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to home
        </button>
        {total > 0 && (
          <h2 className="mx-auto text-base font-semibold text-gray-900 tracking-tight">
            {total} {total === 1 ? "post" : "posts"} ready to publish
          </h2>
        )}
      </div>

      {total === 0 ? (
        <div className="text-center py-20">
          <p className="text-sm text-gray-500">
            All posts handled. You can go back to generate more.
          </p>
        </div>
      ) : (
        <div className="-mx-8 px-8 overflow-x-auto pb-24 md:pb-6 mt-10">
          <div className="flex items-stretch min-w-max">
            {grouped.map((group, i) => (
              <Fragment key={group.account.id}>
                {i > 0 && (
                  <div
                    className="w-px bg-gray-200 self-stretch mx-6"
                    aria-hidden
                  />
                )}
                <PlatformColumn
                  group={group}
                  onEdit={onEdit}
                  onSchedule={onSchedule}
                  onAction={onAction}
                />
              </Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PlatformColumn({
  group,
  onEdit,
  onSchedule,
  onAction,
}: {
  group: PlatformGroup;
  onEdit: (s: Suggestion) => void;
  onSchedule: (id: string, scheduledAt: string) => Promise<void>;
  onAction: (action: string, s: Suggestion) => Promise<void>;
}) {
  const platform = getPlatform(group.account.platform);
  return (
    <div className="w-80 shrink-0 flex flex-col">
      <div className="flex items-center gap-2.5 px-1 pb-4 mb-5 border-b border-gray-200">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-lg text-white shrink-0"
          style={{ backgroundColor: platform?.color ?? "#666" }}
        >
          {platform?.icon}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {platform?.label ?? group.account.platform}
          </p>
          <p className="text-xs text-gray-500 truncate">
            @{group.account.username}
          </p>
        </div>
        <span className="text-xs font-medium text-gray-400 shrink-0">
          {group.posts.length}
        </span>
      </div>
      <div className="space-y-5">
        {group.posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onEdit={() => onEdit(post)}
            onSchedule={(date) => onSchedule(post.id, date.toISOString())}
            onAction={(action) => onAction(action, post)}
          />
        ))}
      </div>
    </div>
  );
}

function PostCard({
  post,
  onEdit,
  onSchedule,
  onAction,
}: {
  post: Suggestion;
  onEdit: () => void;
  onSchedule: (date: Date) => Promise<void>;
  onAction: (action: string) => Promise<void>;
}) {
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const isBusy = busyAction !== null;

  const run = async (action: string, fn: () => Promise<void>) => {
    setBusyAction(action);
    try {
      await fn();
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="p-4">
        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed line-clamp-[12]">
          {post.content}
        </p>
        {post.mediaUrl && (
          <div className="mt-3">
            {post.mediaType === "video" ? (
              <video
                src={post.mediaUrl}
                className="h-28 rounded-lg"
                controls
                aria-label={`Attached video for ${getPlatform(post.socialAccount.platform)?.label ?? post.socialAccount.platform} post`}
              />
            ) : (
              <img
                src={post.mediaUrl}
                alt={`Attached image for ${getPlatform(post.socialAccount.platform)?.label ?? post.socialAccount.platform} post`}
                className="h-28 w-full rounded-lg object-cover"
              />
            )}
          </div>
        )}
      </div>
      <div className="flex items-center justify-end border-t border-gray-100 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              if (
                typeof window !== "undefined" &&
                !window.confirm("Delete this post idea?")
              ) {
                return;
              }
              run("delete", () => onAction("delete"));
            }}
            disabled={isBusy}
            className="flex h-10 w-10 md:h-8 md:w-8 items-center justify-center rounded-lg border border-gray-200 text-red-400 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Delete"
          >
            {busyAction === "delete" ? (
              <SpinnerGapIcon className="h-4 w-4 md:h-3.5 md:w-3.5 animate-spin" />
            ) : (
              <TrashIcon className="h-4 w-4 md:h-3.5 md:w-3.5" />
            )}
          </button>
          <button
            onClick={onEdit}
            disabled={isBusy}
            className="flex h-10 w-10 md:h-8 md:w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Edit"
          >
            <PencilSimpleIcon className="h-4 w-4 md:h-3.5 md:w-3.5" />
          </button>
          <SchedulePicker
            disabled={isBusy}
            platform={post.socialAccount.platform}
            onSchedule={(date) => run("schedule", () => onSchedule(date))}
          />
          <button
            onClick={() => run("publish", () => onAction("publish"))}
            disabled={isBusy}
            className="flex h-10 md:h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-white transition-colors cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: "#e8614d" }}
          >
            {busyAction === "publish" ? (
              <SpinnerGapIcon className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <PaperPlaneTiltIcon className="h-3.5 w-3.5" />
            )}
            {busyAction === "publish" ? "Posting…" : "Post"}
          </button>
        </div>
      </div>
    </div>
  );
}
