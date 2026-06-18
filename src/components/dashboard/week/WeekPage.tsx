"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { SpinnerGapIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { appRouter } from "@/lib/constants/appRouter";
import useApi from "@/lib/hooks/useApi";
import { useDashboardStatus } from "@/lib/hooks/useDashboardStatus";
import { getPlatform } from "@/lib/constants/platforms";
import { coerceMediaItems } from "@/lib/schemas/mediaItems";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { AutopilotHeader } from "./AutopilotHeader";
import { PlanWeekEmptyState } from "./PlanWeekEmptyState";
import { PostCard } from "./PostCard";
import { PostEditSheet } from "./PostEditSheet";
import type { Suggestion } from "@/components/dashboard/publish/types";
import type { TimelineItem, ZernioPost } from "./types";

function dayLabel(iso: string, timeZone: string | null): string {
  const date = new Date(iso);
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: timeZone ?? undefined,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  const today = fmt(new Date());
  const tomorrow = fmt(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const target = fmt(date);
  if (target === today) return "Today";
  if (target === tomorrow) return "Tomorrow";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timeZone ?? undefined,
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(date);
}

function timeLabel(iso: string | null, timeZone: string | null): string {
  if (!iso) return "No time set";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timeZone ?? undefined,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default function WeekPage() {
  const qc = useQueryClient();
  const { data: status } = useDashboardStatus();
  const timezone = status?.timezone ?? null;
  const autopilot = status?.autopilot;
  const activeAccounts = (status?.accounts ?? []).filter(
    (a) => a.status === "active"
  );
  const disconnectedAccounts = (status?.accounts ?? []).filter(
    (a) => a.status !== "active"
  );

  const generating = autopilot?.latestBatch?.status === "generating";
  const batchFailed = autopilot?.latestBatch?.status === "failed";

  // After a manual "plan my week now", bridge the gap until the new batch
  // reaches "generating": invalidate the status query every 4s (max 45s) so the
  // hook's own generating-poll can take over. (`awaitingStart` keeps the
  // "Preparing your week…" loader up meanwhile, masking a stale "failed".)
  const [awaitingStart, setAwaitingStart] = useState(false);
  useEffect(() => {
    if (!awaitingStart) return;
    if (generating) {
      setAwaitingStart(false);
      return;
    }
    const interval = setInterval(() => {
      qc.invalidateQueries({ queryKey: ["dashboardStatus"] });
    }, 4000);
    const timeout = setTimeout(() => setAwaitingStart(false), 45000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [awaitingStart, generating, qc]);

  const { useGet } = useApi();
  const { data: suggestionsData, isLoading: loadingSuggestions } = useGet(
    appRouter.api.suggestions
  ) as { data: { suggestions: Suggestion[] } | undefined; isLoading: boolean };
  const { data: scheduledData, isLoading: loadingScheduled } = useGet(
    appRouter.api.posts,
    { status: "scheduled", limit: 50 }
  ) as { data: { posts: ZernioPost[] } | undefined; isLoading: boolean };
  const { data: publishedData } = useGet(appRouter.api.posts, {
    status: "published",
    limit: 12,
  }) as { data: { posts: ZernioPost[] } | undefined };
  const { data: failedData } = useGet(appRouter.api.posts, {
    status: "failed",
    limit: 10,
  }) as { data: { posts: ZernioPost[] } | undefined };

  const refetchAll = () => {
    // useGet keys are ["get", {url, params}] — invalidate the whole family
    // plus the status poller; cheap on this page's four queries.
    qc.invalidateQueries({ queryKey: ["get"] });
    qc.invalidateQueries({ queryKey: ["dashboardStatus"] });
  };

  // The timeline is hidden while generating, so refetch the draft/scheduled
  // queries the instant generation flips to done — this is the only trigger
  // that fills the revealed week (the status poll drives the flip itself).
  const wasGenerating = useRef(generating);
  useEffect(() => {
    if (wasGenerating.current && !generating) {
      qc.invalidateQueries({ queryKey: ["get"] });
    }
    wasGenerating.current = generating;
  }, [generating, qc]);

  // Prefer the Zernio account id carried on the post (two accounts can share
  // a platform); fall back to platform lookup.
  const usernameFor = (platform: string, accountId?: string): string => {
    if (accountId) {
      const byId = activeAccounts.find((a) => a.lateAccountId === accountId);
      if (byId) return byId.username;
    }
    return activeAccounts.find((a) => a.platform === platform)?.username ?? "you";
  };

  // Plain computation (tens of items at most) — memoizing it invited stale
  // closures over the accounts list for the username lookup.
  const local: TimelineItem[] = (suggestionsData?.suggestions ?? []).map(
    (s) => ({
      kind: "local",
      id: s.id,
      platform: s.socialAccount.platform,
      username: s.socialAccount.username,
      content: s.content,
      contentType: s.contentType,
      mediaItems: s.mediaItems,
      scheduledAt: s.scheduledAt,
      status: s.status === "needs_media" ? "needs_media" : "draft",
    })
  );
  const committed: TimelineItem[] = (scheduledData?.posts ?? []).map((p) => {
    const platform = p.platforms[0]?.platform ?? "instagram";
    return {
      kind: "zernio",
      id: p.id,
      platform,
      username: usernameFor(platform, p.platforms[0]?.accountId),
      content: p.content,
      contentType: (p.mediaItems ?? []).some((m) => m.type === "video")
        ? "video"
        : (p.mediaItems ?? []).length > 1
          ? "carousel"
          : (p.mediaItems ?? []).length === 1
            ? "image"
            : "text",
      mediaItems: coerceMediaItems(p.mediaItems ?? []),
      scheduledAt: p.scheduledAt,
      status: "scheduled",
    };
  });
  const items: TimelineItem[] = [...local, ...committed];

  const failedPosts = failedData?.posts ?? [];
  const autopilotMode: "full_auto" | "review" =
    autopilot?.mode === "review" ? "review" : "full_auto";

  // Group timeline by local day; unscheduled drafts pool at the top.
  const scheduledItems = items
    .filter((i) => i.scheduledAt)
    .sort((a, b) => (a.scheduledAt! < b.scheduledAt! ? -1 : 1));
  const groups = new Map<string, TimelineItem[]>();
  for (const item of scheduledItems) {
    const label = dayLabel(item.scheduledAt!, timezone);
    const list = groups.get(label) ?? [];
    list.push(item);
    groups.set(label, list);
  }
  const grouped = {
    unscheduled: items.filter((i) => !i.scheduledAt),
    days: Array.from(groups.entries()),
  };

  const [editing, setEditing] = useState<TimelineItem | null>(null);
  const isLoading = loadingSuggestions || loadingScheduled;

  // Week summary counts for the header card.
  const scheduledCount = items.filter((i) => i.status === "scheduled").length;
  const needReviewCount = items.filter(
    (i) => i.status === "draft" || i.status === "needs_media"
  ).length;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 min-w-0">
      <DashboardTabs />

      {autopilot ? (
        <AutopilotHeader
          autopilot={autopilot}
          plannedCount={items.length}
          scheduledCount={scheduledCount}
          needReviewCount={needReviewCount}
          weekStart={autopilot.latestBatch?.weekStart ?? null}
          timezone={timezone}
          onChanged={refetchAll}
        />
      ) : (
        <HeaderSkeleton />
      )}

      {/* Attention strip */}
      {(failedPosts.length > 0 || disconnectedAccounts.length > 0) && (
        <div className="flex flex-col gap-2">
          {disconnectedAccounts.map((a) => (
            <AttentionRow
              key={a.id}
              text={`@${a.username} is disconnected — posts to ${getPlatform(a.platform)?.label ?? a.platform} are on hold.`}
              actionLabel="Reconnect"
              href={appRouter.accounts}
            />
          ))}
          {failedPosts.map((p) => (
            <AttentionRow
              key={p.id}
              text={`A post failed to publish: “${p.content.slice(0, 60)}…”`}
              actionLabel="Review"
              href={appRouter.dashboard}
              onClick={() =>
                setEditing({
                  kind: "zernio",
                  id: p.id,
                  platform: p.platforms[0]?.platform ?? "instagram",
                  username: usernameFor(
                    p.platforms[0]?.platform ?? "instagram",
                    p.platforms[0]?.accountId
                  ),
                  content: p.content,
                  contentType: "image",
                  mediaItems: coerceMediaItems(p.mediaItems ?? []),
                  scheduledAt: p.scheduledAt,
                  status: "failed",
                })
              }
            />
          ))}
        </div>
      )}

      {/* Timeline. While the autopilot is still building the week (or we're
          bridging to a freshly-triggered batch), show a single global
          "Preparing your week…" state and reveal nothing else: in-flight drafts
          have media mid-render and aren't committed yet, so exposing their
          edit/remove/schedule controls would race the commit phase (a delete
          here would surface as a phantom "scheduled" in the batch snapshot). The
          week reveals atomically once the batch reaches "ready". A failed batch
          is NOT gated — its drafts stay editable so the user can recover. */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <SpinnerGapIcon className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      ) : generating || awaitingStart || items.length === 0 ? (
        <PlanWeekEmptyState
          phase={
            generating || awaitingStart
              ? "preparing"
              : batchFailed
                ? "failed"
                : "idle"
          }
          onTriggered={() => setAwaitingStart(true)}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {grouped.unscheduled.length > 0 && (
            <DaySection
              label="Drafts"
              items={grouped.unscheduled}
              timezone={timezone}
              mode={autopilotMode}
              onChanged={refetchAll}
            />
          )}
          {grouped.days.map(([label, dayItems]) => (
            <DaySection
              key={label}
              label={label}
              items={dayItems}
              timezone={timezone}
              mode={autopilotMode}
              onChanged={refetchAll}
            />
          ))}
        </div>
      )}

      {/* Published this week */}
      {(publishedData?.posts ?? []).length > 0 && (
        <div className="mt-2 flex flex-col gap-2">
          <h2 className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-gray-400">
            Recently published
          </h2>
          <div className="flex flex-col gap-1.5">
            {(publishedData?.posts ?? []).slice(0, 8).map((p) => {
              const platform = p.platforms[0]?.platform ?? "instagram";
              const meta = getPlatform(platform);
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-2.5 rounded-lg border border-gray-200 bg-white px-3 py-2 min-w-0"
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: meta?.color ?? "#666" }}
                  />
                  <p className="flex-1 truncate text-[13px] text-gray-700 min-w-0">
                    {p.content}
                  </p>
                  <span className="shrink-0 text-[11px] text-gray-400">
                    {p.publishedAt
                      ? dayLabel(p.publishedAt, timezone)
                      : "Published"}
                  </span>
                  {p.platforms[0]?.platformPostUrl ? (
                    <a
                      href={p.platforms[0].platformPostUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 text-[11px] font-medium text-gray-500 hover:text-gray-900"
                    >
                      View
                    </a>
                  ) : null}
                </div>
              );
            })}
          </div>
          <Link
            href={appRouter.results}
            className="self-start text-[12px] font-medium text-gray-500 hover:text-gray-900"
          >
            See what worked →
          </Link>
        </div>
      )}

      {editing ? (
        <PostEditSheet
          // Key forces a remount per post — the sheet seeds its form state
          // from props, so reusing the instance would show stale edits.
          key={`${editing.kind}-${editing.id}`}
          item={editing}
          timezone={timezone}
          onClose={() => setEditing(null)}
          onChanged={refetchAll}
        />
      ) : null}
    </div>
  );
}

// ─── Sections ─────────────────────────────────────────────────────

function HeaderSkeleton() {
  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <div className="h-6 w-32 rounded bg-gray-100" />
        <div className="h-3 w-16 rounded bg-gray-100" />
      </div>
      <div className="grid grid-cols-3 border-t border-gray-200">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`px-5 py-4 ${i > 0 ? "border-l border-gray-200" : ""}`}
          >
            <div className="h-7 w-8 rounded bg-gray-100" />
            <div className="mt-2 h-2.5 w-20 rounded bg-gray-100" />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-4 border-t border-gray-200 px-5 py-4">
        <div className="space-y-2">
          <div className="h-2.5 w-28 rounded bg-gray-100" />
          <div className="h-3 w-56 rounded bg-gray-100" />
        </div>
        <div className="h-9 w-40 rounded-lg bg-gray-100" />
      </div>
    </section>
  );
}

function DaySection({
  label,
  items,
  timezone,
  mode,
  onChanged,
}: {
  label: string;
  items: TimelineItem[];
  timezone: string | null;
  mode: "full_auto" | "review";
  onChanged: () => void;
}) {
  return (
    <section className="flex flex-col gap-3 min-w-0">
      <h2 className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-gray-400">
        {label}
      </h2>
      {items.map((item) => (
        <PostCard
          key={`${item.kind}-${item.id}`}
          item={item}
          timezone={timezone}
          mode={mode}
          timeLabel={timeLabel(item.scheduledAt, timezone)}
          onChanged={onChanged}
        />
      ))}
    </section>
  );
}

function AttentionRow({
  text,
  actionLabel,
  href,
  onClick,
}: {
  text: string;
  actionLabel: string;
  href?: string;
  onClick?: () => void;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 min-w-0">
      <WarningCircleIcon className="h-4 w-4 shrink-0 text-amber-600" />
      <p className="flex-1 truncate text-[13px] text-amber-900 min-w-0">{text}</p>
      {onClick ? (
        <button
          onClick={onClick}
          className="shrink-0 text-[12px] font-semibold text-amber-900 underline-offset-2 hover:underline"
        >
          {actionLabel}
        </button>
      ) : href ? (
        <Link
          href={href}
          className="shrink-0 text-[12px] font-semibold text-amber-900 underline-offset-2 hover:underline"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

