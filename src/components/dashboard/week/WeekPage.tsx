"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  CaretDownIcon,
  CaretUpIcon,
  PaperPlaneTiltIcon,
  SpinnerGapIcon,
  WarningCircleIcon,
  XIcon,
} from "@phosphor-icons/react";
import { appRouter } from "@/lib/constants/appRouter";
import { fetchData } from "@/lib/hooks/useApi";
import { useDashboardStatus } from "@/lib/hooks/useDashboardStatus";
import { getPlatform } from "@/lib/constants/platforms";
import { coerceMediaItems } from "@/lib/schemas/mediaItems";
import { ChatPanel } from "@/components/dashboard/ChatPanel";
import { InstagramPostPreview } from "@/components/dashboard/previews/InstagramPostPreview";
import { FacebookPostPreview } from "@/components/dashboard/previews/FacebookPostPreview";
import { PostEditSheet } from "./PostEditSheet";
import type { Suggestion } from "@/components/dashboard/publish/types";
import type { TimelineItem, ZernioPost } from "./types";

const SUGGESTIONS_KEY = ["week", "suggestions"];
const SCHEDULED_KEY = ["week", "scheduled"];
const PUBLISHED_KEY = ["week", "published"];

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

  const { data: suggestionsData, isLoading: loadingSuggestions } = useQuery<{
    suggestions: Suggestion[];
  }>({
    queryKey: SUGGESTIONS_KEY,
    queryFn: () => fetchData(appRouter.api.suggestions),
  });
  const { data: scheduledData, isLoading: loadingScheduled } = useQuery<{
    posts: ZernioPost[];
  }>({
    queryKey: SCHEDULED_KEY,
    queryFn: () => fetchData(appRouter.api.posts, { status: "scheduled", limit: 50 }),
  });
  const { data: publishedData } = useQuery<{ posts: ZernioPost[] }>({
    queryKey: PUBLISHED_KEY,
    queryFn: () => fetchData(appRouter.api.posts, { status: "published", limit: 12 }),
  });
  const { data: failedData } = useQuery<{ posts: ZernioPost[] }>({
    queryKey: ["week", "failed"],
    queryFn: () => fetchData(appRouter.api.posts, { status: "failed", limit: 10 }),
  });

  const refetchAll = () => {
    qc.invalidateQueries({ queryKey: ["week"] });
    qc.invalidateQueries({ queryKey: ["dashboardStatus"] });
  };

  const usernameForPlatform = (platform: string): string =>
    activeAccounts.find((a) => a.platform === platform)?.username ?? "you";

  const items: TimelineItem[] = useMemo(() => {
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
        username: usernameForPlatform(platform),
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
    return [...local, ...committed];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestionsData, scheduledData, activeAccounts.length]);

  const needsMedia = items.filter((i) => i.status === "needs_media");
  const failedPosts = failedData?.posts ?? [];
  const reviewPending =
    autopilot?.latestBatch &&
    autopilot.latestBatch.status === "ready" &&
    autopilot.latestBatch.mode === "review" &&
    !autopilot.latestBatch.approvedAt &&
    items.some((i) => i.kind === "local" && i.status === "draft");

  // Group timeline by local day; unscheduled drafts pool at the top.
  const grouped = useMemo(() => {
    const scheduled = items
      .filter((i) => i.scheduledAt)
      .sort((a, b) => (a.scheduledAt! < b.scheduledAt! ? -1 : 1));
    const groups = new Map<string, TimelineItem[]>();
    for (const item of scheduled) {
      const label = dayLabel(item.scheduledAt!, timezone);
      const list = groups.get(label) ?? [];
      list.push(item);
      groups.set(label, list);
    }
    return {
      unscheduled: items.filter((i) => !i.scheduledAt),
      days: Array.from(groups.entries()),
    };
  }, [items, timezone]);

  const [editing, setEditing] = useState<TimelineItem | null>(null);
  const isLoading = loadingSuggestions || loadingScheduled;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 min-w-0">
      <AutopilotBanner />
      <BriefBar onChanged={refetchAll} />

      {/* Attention strip */}
      {(needsMedia.length > 0 ||
        failedPosts.length > 0 ||
        disconnectedAccounts.length > 0 ||
        reviewPending) && (
        <div className="flex flex-col gap-2">
          {reviewPending && autopilot?.latestBatch ? (
            <LaunchWeekCard batchId={autopilot.latestBatch.id} onDone={refetchAll} />
          ) : null}
          {disconnectedAccounts.map((a) => (
            <AttentionRow
              key={a.id}
              text={`@${a.username} is disconnected — posts to ${getPlatform(a.platform)?.label ?? a.platform} are on hold.`}
              actionLabel="Reconnect"
              href={appRouter.accounts}
            />
          ))}
          {needsMedia.map((i) => (
            <AttentionRow
              key={i.id}
              text={`A post for @${i.username} is missing its visual.`}
              actionLabel="Fix"
              onClick={() => setEditing(i)}
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
                  username: usernameForPlatform(
                    p.platforms[0]?.platform ?? "instagram"
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

      {/* Timeline */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <SpinnerGapIcon className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center">
          <p className="text-sm font-semibold tracking-tight text-gray-900">
            Nothing scheduled yet
          </p>
          <p className="mx-auto mt-1 max-w-sm text-[13px] leading-relaxed text-gray-500">
            Your next week of posts is prepared every Sunday evening. Drop a
            note above if something&apos;s coming up, or draft posts yourself in
            the chat.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {grouped.unscheduled.length > 0 && (
            <DaySection
              label="Drafts"
              items={grouped.unscheduled}
              timezone={timezone}
              onEdit={setEditing}
            />
          )}
          {grouped.days.map(([label, dayItems]) => (
            <DaySection
              key={label}
              label={label}
              items={dayItems}
              timezone={timezone}
              onEdit={setEditing}
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

function DaySection({
  label,
  items,
  timezone,
  onEdit,
}: {
  label: string;
  items: TimelineItem[];
  timezone: string | null;
  onEdit: (item: TimelineItem) => void;
}) {
  return (
    <section className="flex flex-col gap-3 min-w-0">
      <h2 className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-gray-400">
        {label}
      </h2>
      {items.map((item) => (
        <article key={`${item.kind}-${item.id}`} className="min-w-0">
          {item.platform === "facebook" ? (
            <FacebookPostPreview
              username={item.username}
              caption={item.content}
              mediaItems={item.mediaItems}
              contentType={item.contentType}
              avatarColor={getPlatform(item.platform)?.color}
              timestampLabel={timeLabel(item.scheduledAt, timezone)}
            />
          ) : (
            <InstagramPostPreview
              username={item.username}
              caption={item.content}
              mediaItems={item.mediaItems}
              contentType={item.contentType}
              avatarColor={getPlatform(item.platform)?.color}
              timestampLabel={timeLabel(item.scheduledAt, timezone)}
            />
          )}
          <div className="mt-1.5 flex items-center gap-2 px-1">
            <StatusPill status={item.status} />
            <span className="flex-1" />
            <button
              onClick={() => onEdit(item)}
              className="rounded-lg px-2.5 py-1 text-[12px] font-medium text-gray-500 hover:bg-black/[0.04] hover:text-gray-900"
            >
              Edit
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === "scheduled") {
    return (
      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
        Scheduled
      </span>
    );
  }
  if (status === "needs_media") {
    return (
      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
        Needs a visual
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">
        Failed
      </span>
    );
  }
  return (
    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
      Draft
    </span>
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

function LaunchWeekCard({
  batchId,
  onDone,
}: {
  batchId: string;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const launch = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/autopilot/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId }),
      });
      if (!res.ok) {
        toast.error("Couldn't launch the week. Try again.");
        return;
      }
      const body = (await res.json()) as { scheduled: number };
      toast.success(`Week launched — ${body.scheduled} posts scheduled.`);
      onDone();
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 min-w-0">
      <p className="flex-1 text-[13px] leading-relaxed text-gray-700 min-w-0">
        Next week is planned and waiting for your go. Review the posts below,
        then launch.
      </p>
      <button
        onClick={launch}
        disabled={busy}
        className="shrink-0 rounded-lg px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
        style={{ background: "linear-gradient(180deg, #ec6f5b 0%, #c84a35 100%)" }}
      >
        {busy ? (
          <SpinnerGapIcon className="h-4 w-4 animate-spin" />
        ) : (
          "Launch my week"
        )}
      </button>
    </div>
  );
}

function AutopilotBanner() {
  const { data: status } = useDashboardStatus();
  const autopilot = status?.autopilot;
  if (!autopilot) return null;

  if (autopilot.paused) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
        <p className="text-[13px] text-gray-700">
          Autopilot is paused — no new posts are being planned.{" "}
          <Link
            href={appRouter.settings}
            className="font-semibold underline-offset-2 hover:underline"
          >
            Resume in settings
          </Link>
        </p>
      </div>
    );
  }

  const batch = autopilot.latestBatch;
  if (batch?.status === "generating") {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3">
        <SpinnerGapIcon className="h-4 w-4 shrink-0 animate-spin text-gray-400" />
        <p className="text-[13px] text-gray-700">
          Preparing your week — posts, visuals and times are being put
          together. This takes a few minutes.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
      <p className="text-[13px] text-gray-700">
        Your manager plans a fresh week of posts every{" "}
        <span className="font-semibold">Sunday evening</span> — captions,
        visuals and best times included. You can veto or edit anything below.
      </p>
    </div>
  );
}

function BriefBar({ onChanged }: { onChanged: () => void }) {
  const { data: status } = useDashboardStatus();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[] | null>(
    null
  );

  const activeAccounts = (status?.accounts ?? []).filter(
    (a) => a.status === "active"
  );
  const pendingBrief = status?.autopilot?.pendingBrief ?? null;

  const selected =
    selectedAccountIds ?? activeAccounts.map((a) => a.id);

  const submit = async () => {
    const brief = value.trim();
    if (!brief || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/autopilot/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief }),
      });
      if (!res.ok) {
        toast.error("Couldn't save that note. Try again.");
        return;
      }
      setValue("");
      toast.success("Got it — it'll shape your next batch of posts.");
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const clearBrief = async () => {
    await fetch("/api/autopilot/brief", { method: "DELETE" }).catch(() => {});
    onChanged();
  };

  return (
    <div className="flex flex-col gap-2 min-w-0">
      {pendingBrief ? (
        <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 min-w-0">
          <p className="flex-1 truncate text-[13px] text-gray-700 min-w-0">
            For next week: “{pendingBrief}”
          </p>
          <button
            onClick={clearBrief}
            title="Remove this note"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-gray-400 hover:bg-black/[0.05] hover:text-gray-700"
          >
            <XIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2 min-w-0"
        >
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="What's coming up this week? (an offer, an event, anything)"
            maxLength={1000}
            className="h-8 flex-1 bg-transparent text-[13px] outline-none placeholder:text-gray-400 min-w-0"
          />
          <button
            type="submit"
            disabled={busy || value.trim().length === 0}
            aria-label="Send note"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white disabled:opacity-40"
            style={{ background: "linear-gradient(180deg, #ec6f5b 0%, #c84a35 100%)" }}
          >
            {busy ? (
              <SpinnerGapIcon className="h-4 w-4 animate-spin" />
            ) : (
              <PaperPlaneTiltIcon className="h-4 w-4" />
            )}
          </button>
        </form>
      )}

      <button
        onClick={() => setChatOpen((v) => !v)}
        className="flex items-center gap-1 self-start px-1 text-[12px] font-medium text-gray-500 hover:text-gray-900"
      >
        {chatOpen ? (
          <>
            <CaretUpIcon className="h-3 w-3" /> Close chat
          </>
        ) : (
          <>
            <CaretDownIcon className="h-3 w-3" /> Draft something now
          </>
        )}
      </button>

      {chatOpen && activeAccounts.length > 0 ? (
        <div className="min-w-0">
          <ChatPanel
            accounts={activeAccounts}
            selectedAccountIds={selected}
            onSelectedAccountIdsChange={setSelectedAccountIds}
            onSuggestionsChanged={onChanged}
          />
        </div>
      ) : null}
    </div>
  );
}
