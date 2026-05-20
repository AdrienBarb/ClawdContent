"use client";

import { useMemo } from "react";
import {
  CheckCircleIcon,
  ClockIcon,
  HourglassIcon,
  ImageIcon,
} from "@phosphor-icons/react";
import type { PlatformSuggestion } from "@/components/dashboard/platform/types";

const DAY_LABELS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_LABELS_LONG = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

/** Returns Mon-anchored day index (0=Mon..6=Sun) for a Date. */
function mondayIndex(d: Date): number {
  // JS Sun=0..Sat=6 — shift so Mon=0..Sun=6.
  return (d.getDay() + 6) % 7;
}

/** Hour formatted as `9am`/`12pm`/`6pm`. */
function fmtHour(h: number): string {
  if (h === 0) return "12am";
  if (h === 12) return "12pm";
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

interface Props {
  suggestions: PlatformSuggestion[];
  onEdit: (suggestionId: string) => void;
}

interface BinnedDay {
  index: number; // 0=Monday..6=Sunday (the column position)
  date: Date;
  posts: PlatformSuggestion[];
}

export default function UpcomingPostsCalendar({ suggestions, onEdit }: Props) {
  const days = useMemo<BinnedDay[]>(() => {
    const now = new Date();
    const todayIdx = mondayIndex(now);
    // Start of this week's Monday at midnight local
    const monday = new Date(now);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() - todayIdx);

    const buckets: BinnedDay[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      buckets.push({ index: i, date: d, posts: [] });
    }

    const unscheduled: PlatformSuggestion[] = [];

    for (const s of suggestions) {
      if (s.scheduledAt) {
        const sd = new Date(s.scheduledAt);
        // Only include if inside this week's window
        const start = monday.getTime();
        const end = start + 7 * 24 * 60 * 60 * 1000;
        if (sd.getTime() >= start && sd.getTime() < end) {
          buckets[mondayIndex(sd)].posts.push(s);
        }
      } else {
        // Bin unscheduled drafts by their suggestedDay so they show up
        // somewhere on the calendar — but only if no scheduled time exists.
        const i = Math.min(6, Math.max(0, s.suggestedDay));
        buckets[i].posts.push(s);
      }
      // Note: unscheduled drafts bucket is not surfaced today — every
      // suggestion ends up in a day column. (kept here for future use)
      void unscheduled;
    }

    return buckets;
  }, [suggestions]);

  const totalPosts = suggestions.length;
  const todayIdx = mondayIndex(new Date());

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h2 className="text-[16px] font-semibold text-gray-900">This week</h2>
        <p className="text-[12px] text-gray-500 tabular-nums">
          {totalPosts} {totalPosts === 1 ? "post" : "posts"} planned
        </p>
      </div>

      {/* Desktop: 7-column grid */}
      <div className="mt-4 hidden grid-cols-7 gap-3 lg:grid">
        {days.map((day) => (
          <DayColumn
            key={day.index}
            day={day}
            isToday={day.index === todayIdx}
            onEdit={onEdit}
          />
        ))}
      </div>

      {/* Mobile: vertical stack */}
      <ul className="mt-4 space-y-3 lg:hidden">
        {days.map((day) => (
          <li key={day.index}>
            <DayRow
              day={day}
              isToday={day.index === todayIdx}
              onEdit={onEdit}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function DayColumn({
  day,
  isToday,
  onEdit,
}: {
  day: BinnedDay;
  isToday: boolean;
  onEdit: (id: string) => void;
}) {
  // Today marker stays neutral — coral is reserved for primary CTAs per
  // the design system. A heavier border + darker label is enough signal.
  return (
    <div
      className={`flex flex-col rounded-2xl border bg-white p-3 ${
        isToday ? "border-gray-400" : "border-gray-200"
      }`}
    >
      <div className="flex items-baseline justify-between">
        <p
          className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${
            isToday ? "text-gray-900" : "text-gray-500"
          }`}
        >
          {DAY_LABELS_SHORT[day.index]}
        </p>
        <p className="text-[11px] tabular-nums text-gray-400">
          {day.date.getDate()}
        </p>
      </div>

      <div className="mt-2 space-y-2">
        {day.posts.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-200 p-2 text-center text-[11px] text-gray-400">
            Empty
          </p>
        ) : (
          day.posts.map((p) => (
            <PostCardMini key={p.id} post={p} onEdit={onEdit} />
          ))
        )}
      </div>
    </div>
  );
}

function DayRow({
  day,
  isToday,
  onEdit,
}: {
  day: BinnedDay;
  isToday: boolean;
  onEdit: (id: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-[13px] font-semibold text-gray-900">
          {DAY_LABELS_LONG[day.index]}
          {isToday && (
            <span className="ml-2 text-[10.5px] font-medium uppercase tracking-[0.12em] text-gray-500">
              Today
            </span>
          )}
        </p>
        <p className="text-[11px] tabular-nums text-gray-400">
          {day.posts.length}{" "}
          {day.posts.length === 1 ? "post" : "posts"}
        </p>
      </div>

      {day.posts.length === 0 ? (
        <p className="mt-2 text-[12px] text-gray-400">No posts planned.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {day.posts.map((p) => (
            <PostCardMini key={p.id} post={p} onEdit={onEdit} />
          ))}
        </div>
      )}
    </div>
  );
}

function PostCardMini({
  post,
  onEdit,
}: {
  post: PlatformSuggestion;
  onEdit: (id: string) => void;
}) {
  const time = post.scheduledAt
    ? new Date(post.scheduledAt).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })
    : fmtHour(post.suggestedHour);

  const isApprovalPending =
    post.approvalRequired && !post.approvedAt && !post.publishedExternalId;
  const isScheduled = !!post.publishedExternalId;

  return (
    <button
      type="button"
      onClick={() => onEdit(post.id)}
      className="group relative block w-full overflow-hidden rounded-xl border border-gray-200 bg-white p-2.5 text-left transition hover:border-gray-300 hover:shadow-sm"
    >
      <div className="flex items-center justify-between gap-2 text-[10.5px] tabular-nums text-gray-500">
        <span className="flex items-center gap-1">
          <ClockIcon size={11} weight="bold" />
          {time}
        </span>
        {isScheduled && (
          <span className="flex items-center gap-1 text-emerald-700">
            <CheckCircleIcon size={11} weight="fill" />
            Scheduled
          </span>
        )}
        {isApprovalPending && (
          <span className="flex items-center gap-1 text-amber-700">
            <HourglassIcon size={11} weight="bold" />
            Awaiting approval
          </span>
        )}
      </div>

      {post.imageUrl && (
        <div className="mt-2 aspect-square w-full overflow-hidden rounded-md bg-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.imageUrl}
            alt={`Image for post: ${post.content.slice(0, 80)}`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      <p className="mt-2 line-clamp-3 text-[12px] leading-relaxed text-gray-800">
        {post.content}
      </p>

      {!post.imageUrl && post.contentType === "image" && (
        <p className="mt-1 inline-flex items-center gap-1 text-[10.5px] text-gray-400">
          <ImageIcon size={10} weight="bold" />
          Image pending
        </p>
      )}
    </button>
  );
}
