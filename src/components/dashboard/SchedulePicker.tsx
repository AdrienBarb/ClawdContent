"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarIcon,
  CaretDownIcon,
  CheckIcon,
  ClockIcon,
  PushPinIcon,
  XIcon,
} from "@phosphor-icons/react";
import { RemoveScroll } from "react-remove-scroll";
import type { DayButtonProps } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import useApi from "@/lib/hooks/useApi";
import { appRouter } from "@/lib/constants/appRouter";
import { PLATFORM_CONFIG } from "@/lib/insights/platformConfig";
import {
  type NormalizedSlot,
  atTime,
  dayOfWeekZernio,
  getBestSlots,
  isSameDay,
  pad2,
  pickNextSlot,
} from "@/lib/services/bestTimes";
import { cn } from "@/lib/utils";

interface BestTimeSlotApi {
  day_of_week: number;
  hour: number;
  avg_engagement?: number;
  post_count?: number;
}

// 96 quarter-hour options across a day. Stable across renders.
const TIME_OPTIONS: string[] = (() => {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      out.push(
        `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
      );
    }
  }
  return out;
})();

function formatTimeLabel(time: string): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const hour = h % 12 || 12;
  const ampm = h < 12 ? "AM" : "PM";
  return `${hour}:${pad2(m)} ${ampm}`;
}

// Hoisted so the function reference is stable across renders. Defining this
// inline (`components={{ DayButton: ({...}) => ... }}`) made react-day-picker
// see a brand-new component type each render and unmount + remount every cell.
function PickerDayButton({ day, modifiers, ...buttonProps }: DayButtonProps) {
  return (
    <button
      {...buttonProps}
      data-day={day.date.toLocaleDateString()}
      className={cn(
        "flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-sm font-medium transition-colors",
        "outline-none focus-visible:ring-2 focus-visible:ring-[#e8614d]/40",
        modifiers.selected &&
          "!bg-[#e8614d] !text-white hover:!bg-[#e8614d]",
        !modifiers.selected &&
          !modifiers.disabled &&
          "text-gray-700 hover:bg-gray-100",
        !modifiers.selected &&
          modifiers.today &&
          "font-semibold text-[#e8614d]",
        modifiers.disabled &&
          "cursor-not-allowed text-gray-300 hover:bg-transparent"
      )}
    />
  );
}

// Hoisted to module scope so prop identity is stable — react-day-picker
// otherwise re-runs internal effects when these objects re-mount per render.
const CALENDAR_CLASS_NAMES = {
  // shadcn defaults to w-fit, leaving empty space in our 320px popover.
  root: "w-full",
  // react-day-picker's stylesheet pins .rdp-months to `max-width: fit-content`,
  // which collapses the calendar inside our full-width popover.
  months: "!max-w-none w-full",
  month: "flex w-full flex-col gap-3",
  // Inset the prev/next chevrons so they don't kiss the popover's rounded corners.
  nav: "absolute inset-x-2 top-1.5 flex items-center justify-between",
  weekdays: "flex w-full",
  weekday:
    "flex-1 select-none text-center text-[10px] font-medium text-gray-400 uppercase tracking-wide",
  week: "mt-1 flex w-full",
  // Strip shadcn's default `bg-accent` on today so PickerDayButton fully owns the look.
  today: "",
  day: "group/day relative flex flex-1 aspect-square items-center justify-center select-none p-0",
};

const CALENDAR_COMPONENTS = { DayButton: PickerDayButton };

function formatVerboseLabel(iso: string | null | undefined): string {
  if (!iso) return "Now";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function SchedulePicker({
  disabled,
  onSchedule,
  platform,
  variant = "compact",
  scheduledAt,
  onCancelSchedule,
  joinRight = false,
  compactLabel = "Schedule",
}: {
  disabled: boolean;
  onSchedule: (date: Date) => void;
  platform?: string;
  /**
   * "compact": small icon trigger labelled "Schedule" (used by BulkBar + the
   * legacy single-purpose schedule button). "verbose": the wider split-button
   * left segment that displays the current scheduledAt (or "Now") plus a
   * chevron.
   */
  variant?: "compact" | "verbose";
  /** Only used when variant="verbose" — drives the displayed label. */
  scheduledAt?: string | null;
  /** Shown in the popover footer when scheduled. Single click clears the
   *  staged time on the draft (does NOT publish — the draft stays as-is). */
  onCancelSchedule?: () => void;
  /** When true, the trigger has no right-side rounding/border so it can sit
   *  flush against an adjacent CTA in a split-button layout. */
  joinRight?: boolean;
  /** Label for the compact variant trigger. Defaults to "Schedule". */
  compactLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  // User's manual picks. Undefined/empty = "fall back to derived default".
  // Keeping these separate from the displayed values is the React-y way:
  // the displayed selection is derived from data + user input.
  const [pickedDate, setPickedDate] = useState<Date | undefined>(undefined);
  const [pickedTime, setPickedTime] = useState<string>("");

  // Refresh `now`/`today` whenever the popover opens, so a picker left open
  // across midnight still computes against the current day. Falls back to a
  // mount-time value if it's never opened (won't render any date logic anyway).
  const [now, setNow] = useState(() => new Date());
  const [today, setToday] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  useEffect(() => {
    if (!open) return;
    const fresh = new Date();
    setNow(fresh);
    const startOfDay = new Date(fresh);
    startOfDay.setHours(0, 0, 0, 0);
    setToday(startOfDay);
  }, [open]);

  const { useGet } = useApi();

  const { data: bestTimesData } = useGet(
    appRouter.api.analyticsBestTimes,
    platform ? { platform } : undefined,
    { enabled: open && !!platform, staleTime: 5 * 60 * 1000 }
  ) as { data: { slots: BestTimeSlotApi[] } | undefined };

  const { data: statusData } = useGet(
    appRouter.api.dashboardStatus,
    undefined,
    { enabled: open, staleTime: 60 * 1000 }
  ) as { data: { timezone: string | null } | undefined };

  const timezone =
    statusData?.timezone ??
    (typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "");

  // Single source of truth for posting slots. API data wins when present.
  // Three-tier fallback (API → platformConfig → generic) lives in bestTimes.
  const allSlots: NormalizedSlot[] = useMemo(
    () =>
      getBestSlots({
        insightsBestTimes: bestTimesData?.slots,
        platform,
      }),
    [bestTimesData, platform]
  );

  // Default selection: when a scheduledAt exists (rescheduling an already-set
  // post), seed from it so the user lands on the current time instead of a
  // computed best-slot. Otherwise derive from `allSlots` like the pills do.
  const defaultSelection = useMemo(() => {
    if (scheduledAt) {
      const d = new Date(scheduledAt);
      if (!isNaN(d.getTime()) && d.getTime() > now.getTime()) {
        return {
          date: d,
          time: `${pad2(d.getHours())}:${pad2(Math.floor(d.getMinutes() / 15) * 15)}`,
        };
      }
    }
    return pickNextSlot(allSlots, now, today);
  }, [scheduledAt, allSlots, now, today]);

  // Effective values shown in the UI: user's pick wins, else derived default.
  const selectedDate = pickedDate ?? defaultSelection.date;
  const selectedTime = pickedTime || defaultSelection.time;

  // Controlled `month` state so the calendar can navigate via its chevrons
  // without us forcing a remount via `key=`. Two-way sync: when the selected
  // date jumps to a different month (e.g. API data shifts the default), follow.
  const [month, setMonth] = useState<Date>(() => selectedDate);
  useEffect(() => {
    setMonth((prev) =>
      prev.getFullYear() === selectedDate.getFullYear() &&
      prev.getMonth() === selectedDate.getMonth()
        ? prev
        : selectedDate
    );
  }, [selectedDate]);

  // Stable identity for prop diffing inside react-day-picker.
  const disabledRange = useMemo(() => ({ before: today }), [today]);

  // Pill count tracks the platform's recommended posts/day (1–4). Falls back
  // to 3 when no platform is provided.
  const pillCount = useMemo(() => {
    const recommended =
      platform && PLATFORM_CONFIG[platform]
        ? PLATFORM_CONFIG[platform].recommendedPostsPerDay
        : 3;
    return Math.min(4, Math.max(1, recommended));
  }, [platform]);

  // Top-N highest-engagement slots for the selected day. If the selected day
  // is today, drop slots whose hour has already passed — they can't be acted on.
  // Then re-sort by hour for chronological readability.
  const slotsForSelectedDay: NormalizedSlot[] = useMemo(() => {
    const dz = dayOfWeekZernio(selectedDate);
    const isToday = isSameDay(selectedDate, today);
    const nowMs = now.getTime();
    return allSlots
      .filter((s) => {
        if (s.day !== dz) return false;
        if (s.engagement <= 0) return false;
        if (!isToday) return true;
        return atTime(today, s.hour).getTime() > nowMs;
      })
      .slice(0, pillCount)
      .sort((a, b) => a.hour - b.hour);
  }, [allSlots, selectedDate, today, now, pillCount]);

  // 15-min time options, filtered to future-only when the selected day is today.
  const timeOptions: string[] = useMemo(() => {
    const isToday = isSameDay(selectedDate, today);
    if (!isToday) return TIME_OPTIONS;
    const nowMs = now.getTime();
    return TIME_OPTIONS.filter((t) => {
      const [h, m] = t.split(":").map(Number);
      return atTime(today, h, m).getTime() > nowMs;
    });
  }, [selectedDate, today, now]);

  // Scroll the time dropdown so the selected option is centered when it opens.
  // Adjusts the popover container's scrollTop directly so we don't accidentally
  // scroll the outer page.
  const selectedTimeRef = useCallback((el: HTMLButtonElement | null) => {
    if (!el) return;
    requestAnimationFrame(() => {
      const parent = el.parentElement;
      if (!parent) return;
      parent.scrollTop =
        el.offsetTop - parent.clientHeight / 2 + el.offsetHeight / 2;
    });
  }, []);

  const handleSelectDate = useCallback(
    (d: Date | undefined) => {
      setPickedDate(d);
      if (!d) {
        setPickedTime("");
        return;
      }
      const dz = dayOfWeekZernio(d);
      const isToday = isSameDay(d, today);
      const nowMs = now.getTime();
      const best = allSlots.find((s) => {
        if (s.day !== dz) return false;
        if (!isToday) return true;
        return atTime(today, s.hour).getTime() > nowMs;
      });
      setPickedTime(best ? `${pad2(best.hour)}:00` : "10:00");
    },
    [allSlots, today, now]
  );

  const handleConfirm = useCallback(() => {
    if (!selectedTime) return;
    const [h, m] = selectedTime.split(":").map(Number);
    onSchedule(atTime(selectedDate, h, m));
    setOpen(false);
    setPickedDate(undefined);
    setPickedTime("");
  }, [onSchedule, selectedDate, selectedTime]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {variant === "verbose" ? (
          <button
            disabled={disabled}
            className={cn(
              "flex h-10 md:h-8 cursor-pointer items-center gap-1.5 border border-gray-200 px-2.5 text-[12px] font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50",
              joinRight ? "rounded-l-lg border-r-0" : "rounded-lg"
            )}
          >
            <PushPinIcon className="h-3.5 w-3.5" weight="duotone" />
            <span className="tabular-nums">
              {formatVerboseLabel(scheduledAt)}
            </span>
            <CaretDownIcon className="h-3 w-3 text-gray-400" weight="bold" />
          </button>
        ) : (
          <button
            disabled={disabled}
            className="flex h-10 md:h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 px-3 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            {compactLabel}
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        collisionPadding={16}
        className="z-[70] w-[320px] overflow-hidden rounded-2xl border border-gray-200 bg-white p-0 shadow-lg"
      >
        <Calendar
          mode="single"
          month={month}
          onMonthChange={setMonth}
          selected={selectedDate}
          onSelect={handleSelectDate}
          disabled={disabledRange}
          showOutsideDays={false}
          captionLayout="label"
          className="w-full bg-white px-2 py-3"
          classNames={CALENDAR_CLASS_NAMES}
          components={CALENDAR_COMPONENTS}
        />

        {/* Posting Slots */}
        <div className="border-t border-gray-100 px-4 py-3">
          <p className="mb-2 text-xs font-semibold text-gray-700">
            Best times
          </p>
          {slotsForSelectedDay.length === 0 ? (
            <p className="text-xs text-gray-400">
              No standout times for{" "}
              {selectedDate.toLocaleDateString(undefined, { weekday: "long" })}{" "}
              — pick any time below.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {slotsForSelectedDay.map((slot) => {
                const time = `${pad2(slot.hour)}:00`;
                const isSelected = selectedTime === time;
                return (
                  <button
                    key={`${slot.day}-${slot.hour}`}
                    onClick={() => setPickedTime(time)}
                    className={cn(
                      "flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                      isSelected
                        ? "border-[#e8614d] bg-[#fef2f0] text-[#e8614d]"
                        : "border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                    )}
                  >
                    {formatTimeLabel(time)}
                    {isSelected && (
                      <CheckIcon className="h-3 w-3" weight="bold" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Select Time */}
        <div className="px-4 pb-3">
          <p className="mb-2 text-xs font-semibold text-gray-700">
            Select Time
          </p>
          <Popover open={timeOpen} onOpenChange={setTimeOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-left transition-colors hover:border-gray-300 focus:outline-none focus:border-gray-300"
              >
                <ClockIcon className="h-4 w-4 text-gray-400" />
                <span className="flex-1 text-sm text-gray-900">
                  {formatTimeLabel(selectedTime)}
                </span>
                {timezone && (
                  <span className="ml-auto truncate text-xs text-gray-400">
                    {timezone}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              sideOffset={4}
              className="z-[80] w-[var(--radix-popover-trigger-width)] rounded-lg border border-gray-200 bg-white p-0 shadow-lg"
            >
              {/* RemoveScroll registers this as an allowed scroll zone so
                  the parent Dialog's react-remove-scroll body lock doesn't
                  swallow wheel events here. */}
              <RemoveScroll className="flex max-h-[240px] flex-col overflow-y-auto p-1">
                {timeOptions.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-gray-400">
                    No upcoming times today.
                  </p>
                ) : (
                  timeOptions.map((time) => {
                    const isSelected = selectedTime === time;
                    return (
                      <button
                        key={time}
                        ref={isSelected ? selectedTimeRef : undefined}
                        onClick={() => {
                          setPickedTime(time);
                          setTimeOpen(false);
                        }}
                        className={cn(
                          "rounded-md px-3 py-1.5 text-left text-sm transition-colors cursor-pointer",
                          isSelected
                            ? "bg-[#fef2f0] font-medium text-[#e8614d]"
                            : "text-gray-700 hover:bg-gray-50"
                        )}
                      >
                        {formatTimeLabel(time)}
                      </button>
                    );
                  })
                )}
              </RemoveScroll>
            </PopoverContent>
          </Popover>
        </div>

        {/* Confirm */}
        <div className="border-t border-gray-100 px-4 py-3 flex flex-col gap-2">
          <button
            onClick={handleConfirm}
            disabled={!selectedTime}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <CalendarIcon className="h-4 w-4" />
            {`Schedule for ${selectedDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })} at ${formatTimeLabel(selectedTime)}`}
          </button>
          {onCancelSchedule && scheduledAt && (
            <button
              type="button"
              onClick={() => {
                onCancelSchedule();
                setOpen(false);
                setPickedDate(undefined);
                setPickedTime("");
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 cursor-pointer"
            >
              <XIcon className="h-4 w-4" weight="bold" />
              Cancel schedule
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
