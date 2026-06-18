"use client";

import toast from "react-hot-toast";
import {
  CaretDownIcon,
  CheckIcon,
  ClockIcon,
  SpinnerGapIcon,
} from "@phosphor-icons/react";
import { appRouter } from "@/lib/constants/appRouter";
import useApi from "@/lib/hooks/useApi";
import { useConfirm } from "@/lib/hooks/useConfirm";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AutopilotStatus } from "@/lib/hooks/useDashboardStatus";

const ACTIVE_DOT = "#22a565"; // green — autopilot is running
const PAUSED_DOT = "#9ca3af"; // gray — autopilot is paused

type PublishingState = "full_auto" | "review" | "paused";

const MODE_OPTIONS: {
  value: PublishingState;
  label: string;
  desc: string;
}[] = [
  {
    value: "full_auto",
    label: "Publish automatically",
    desc: "Posts go out on their own at the scheduled times.",
  },
  {
    value: "review",
    label: "Approve first",
    desc: "Nothing publishes until you approve the week below.",
  },
  {
    value: "paused",
    label: "Paused",
    desc: "Stop planning new weeks until you turn it back on.",
  },
];

function weekRangeLabel(
  weekStartIso: string | null,
  timeZone: string | null
): string | null {
  if (!weekStartIso) return null;
  const start = new Date(weekStartIso);
  const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date, opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-US", {
      timeZone: timeZone ?? undefined,
      ...opts,
    }).format(d);
  const sd = fmt(start, { day: "numeric" });
  const ed = fmt(end, { day: "numeric" });
  const sm = fmt(start, { month: "short" });
  const em = fmt(end, { month: "short" });
  return sm === em ? `${sd}–${ed} ${sm}` : `${sd} ${sm} – ${ed} ${em}`;
}

/**
 * When the next 7-day window is planned. Each window rolls 7 days from the
 * current one's anchor and is generated the evening before it starts — i.e.
 * 6 days after this window's anchor, at 5:00 PM local.
 */
function nextPlanLabel(
  weekStartIso: string | null,
  timeZone: string | null
): string | null {
  if (!weekStartIso) return null;
  const fireDay = new Date(
    new Date(weekStartIso).getTime() + 6 * 24 * 60 * 60 * 1000
  );
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timeZone ?? undefined,
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(fireDay);
}

export function AutopilotHeader({
  autopilot,
  plannedCount,
  scheduledCount,
  needReviewCount,
  weekStart,
  timezone,
  onChanged,
}: {
  autopilot: AutopilotStatus;
  plannedCount: number;
  scheduledCount: number;
  needReviewCount: number;
  weekStart: string | null;
  timezone: string | null;
  onChanged: () => void;
}) {
  const { usePost } = useApi();
  const { confirm, dialog } = useConfirm();
  const { mutate: setMode, isPending } = usePost(
    appRouter.api.autopilotPublishingMode,
    {
      onSuccess: (res: {
        effect?: string;
        count?: number;
        skipped?: number;
      }) => {
        const n = res?.count ?? 0;
        const skipped = res?.skipped ?? 0;
        if (res?.effect === "reverted") {
          if (n > 0) {
            toast.success(
              `${n} post${n === 1 ? "" : "s"} pulled back for your review.`
            );
          }
          if (skipped > 0) {
            toast(
              `${skipped} post${skipped === 1 ? "" : "s"} stayed live — already out or in progress.`
            );
          }
        } else if (res?.effect === "committed" && n > 0) {
          toast.success(`${n} post${n === 1 ? "" : "s"} scheduled.`);
        }
        onChanged();
      },
      onError: () =>
        toast.error("Couldn't change the publishing mode. Try again."),
    }
  );

  const paused = autopilot.paused;
  const mode = autopilot.mode === "review" ? "review" : "full_auto";
  const state: PublishingState = paused ? "paused" : mode;
  const current = MODE_OPTIONS.find((o) => o.value === state)!;

  const batchStatus = autopilot.latestBatch?.status;
  const generating = !paused && batchStatus === "generating";
  const failed = !paused && batchStatus === "failed";

  const range = weekRangeLabel(weekStart, timezone);
  const nextPlan = nextPlanLabel(weekStart, timezone);

  const selectState = async (value: PublishingState) => {
    if (value === state || isPending) return;
    // Pulling an already-scheduled week back into review un-schedules those
    // posts from the platform — confirm before touching live schedules. This
    // applies from BOTH full_auto and paused (pause leaves posts scheduled).
    if (value === "review" && state !== "review" && scheduledCount > 0) {
      const ok = await confirm({
        title: "Pull this week back to review?",
        description: `${scheduledCount} scheduled post${
          scheduledCount === 1 ? "" : "s"
        } will stop auto-publishing and wait for your approval. Posts that already went out stay live.`,
        confirmLabel: "Pull back",
        cancelLabel: "Keep auto",
      });
      if (!ok) return;
    }
    setMode({ state: value });
  };

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      {/* Title + week range */}
      <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-4">
        <h1 className="text-[26px] font-bold leading-none tracking-tight text-gray-900">
          Your week
        </h1>
        <span className="shrink-0 text-[13px] text-gray-400">
          {generating ? (
            <span className="inline-flex items-center gap-1.5">
              <SpinnerGapIcon className="h-3.5 w-3.5 animate-spin" />
              Preparing…
            </span>
          ) : failed ? (
            "Retry pending"
          ) : range ? (
            <span className="tabular-nums">{range}</span>
          ) : null}
        </span>
      </div>

      {/* Week summary — 3 stats */}
      <div className="grid grid-cols-3 border-t border-gray-200">
        <Stat n={plannedCount} label="Planned" />
        <Stat n={scheduledCount} label="Scheduled" dot={ACTIVE_DOT} divider />
        <Stat n={needReviewCount} label="Need review" dot="#ec6f5b" divider />
      </div>

      {/* Publishing mode (pause folded into the select) */}
      <div className="flex items-center justify-between gap-4 border-t border-gray-200 px-5 py-4">
        <div className="min-w-0">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-gray-400">
            Publishing mode
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-gray-600">
            {current.desc}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              disabled={isPending || generating}
              title={
                generating ? "Locked while we prepare your week" : undefined
              }
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] font-medium text-gray-900 shadow-sm transition-colors hover:bg-black/[0.02] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: paused ? PAUSED_DOT : ACTIVE_DOT }}
              />
              {current.label}
              <CaretDownIcon className="h-3.5 w-3.5 text-gray-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={6} className="w-[300px]">
            {MODE_OPTIONS.map((opt) => (
              <DropdownMenuItem
                key={opt.value}
                onClick={() => selectState(opt.value)}
                className="flex items-start gap-2.5 px-2.5 py-2"
              >
                <span
                  className="mt-1 h-2 w-2 shrink-0 rounded-full"
                  style={{
                    backgroundColor:
                      opt.value === "paused" ? PAUSED_DOT : ACTIVE_DOT,
                  }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-medium text-gray-900">
                      {opt.label}
                    </span>
                    {opt.value === state && (
                      <CheckIcon
                        className="h-3.5 w-3.5 text-gray-900"
                        weight="bold"
                      />
                    )}
                  </div>
                  <p className="mt-0.5 text-[12px] leading-snug text-gray-500">
                    {opt.desc}
                  </p>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Next plan */}
      <div className="flex items-center gap-2 border-t border-gray-200 bg-black/[0.015] px-5 py-3 text-[12.5px] text-gray-500">
        <ClockIcon className="h-4 w-4 shrink-0 text-gray-400" />
        <span>
          {paused ? (
            "Planning is paused — turn autopilot back on to resume."
          ) : nextPlan ? (
            <>
              Next plan:{" "}
              <span className="font-semibold text-gray-700">
                {nextPlan} at 5:00 PM
              </span>
              , your time.
            </>
          ) : (
            "Your next 7 days are planned automatically, every week."
          )}
        </span>
      </div>
      </section>
      {dialog}
    </>
  );
}

function Stat({
  n,
  label,
  dot,
  divider,
}: {
  n: number;
  label: string;
  dot?: string;
  divider?: boolean;
}) {
  return (
    <div className={`px-5 py-4 ${divider ? "border-l border-gray-200" : ""}`}>
      <div className="text-[28px] font-bold leading-none tracking-tight text-gray-900 tabular-nums">
        {n}
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        {dot ? (
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: dot }}
          />
        ) : null}
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-gray-400">
          {label}
        </span>
      </div>
    </div>
  );
}
