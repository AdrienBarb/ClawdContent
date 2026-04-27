"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarIcon, CheckIcon, ClockIcon } from "@phosphor-icons/react";
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
import { cn } from "@/lib/utils";

interface BestTimeSlotApi {
  day_of_week: number;
  hour: number;
  avg_engagement?: number;
  post_count?: number;
}

interface NormalizedSlot {
  day: number; // 0=Mon..6=Sun
  hour: number; // 0-23
  engagement: number; // higher = better
}

const GENERIC_DEFAULT_SLOTS: NormalizedSlot[] = [
  { day: 1, hour: 10, engagement: 3 },
  { day: 3, hour: 13, engagement: 2 },
  { day: 5, hour: 17, engagement: 1 },
];

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

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

function formatTimeLabel(time: string): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const hour = h % 12 || 12;
  const ampm = h < 12 ? "AM" : "PM";
  return `${hour}:${pad2(m)} ${ampm}`;
}

// Returns a new Date with hour/minute applied; preserves the calendar day of `base`.
function atTime(base: Date, hour: number, minute = 0): Date {
  const d = new Date(base);
  d.setHours(hour, minute, 0, 0);
  return d;
}

// JS getDay() is Sun=0..Sat=6; project data is Mon=0..Sun=6.
function dayOfWeekZernio(date: Date): number {
  return (date.getDay() + 6) % 7;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
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

// Default selection: TODAY at today's highest-engagement upcoming hour.
// If no remaining slot today, falls forward to the next day with a slot
// (date becomes that next day). Slots must be sorted by engagement DESC.
function findDefaultSelection(
  slots: NormalizedSlot[],
  now: Date,
  today: Date
): { date: Date; time: string } {
  // Try today first — highest-engagement slot whose hour hasn't passed.
  const todayDow = dayOfWeekZernio(today);
  for (const slot of slots) {
    if (slot.day !== todayDow) continue;
    const candidate = atTime(today, slot.hour);
    if (candidate.getTime() > now.getTime()) {
      return { date: candidate, time: `${pad2(slot.hour)}:00` };
    }
  }
  // No future slot today — walk forward day by day, take each day's best.
  for (let offset = 1; offset <= 7; offset++) {
    const day = new Date(today);
    day.setDate(day.getDate() + offset);
    const dow = dayOfWeekZernio(day);
    const best = slots.find((s) => s.day === dow);
    if (best) {
      return { date: atTime(day, best.hour), time: `${pad2(best.hour)}:00` };
    }
  }
  // Final fallback: today/tomorrow at 10:00.
  const fallback = atTime(today, 10);
  if (fallback.getTime() <= now.getTime()) {
    fallback.setDate(fallback.getDate() + 1);
  }
  return { date: fallback, time: "10:00" };
}

export function SchedulePicker({
  disabled,
  onSchedule,
  platform,
}: {
  disabled: boolean;
  onSchedule: (date: Date) => void;
  platform?: string;
}) {
  const [open, setOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  // User's manual picks. Undefined/empty = "fall back to derived default".
  // Keeping these separate from the displayed values is the React-y way:
  // the displayed selection is derived from data + user input.
  const [pickedDate, setPickedDate] = useState<Date | undefined>(undefined);
  const [pickedTime, setPickedTime] = useState<string>("");

  // Captured once on mount — purity-safe vs calling new Date() in render.
  const [now] = useState(() => new Date());
  const [today] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

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

  // Single source of truth for posting slots. API data wins when present
  // (sorted by avg_engagement descending). Otherwise PLATFORM_CONFIG. Otherwise
  // a generic 3-slot fallback.
  const allSlots: NormalizedSlot[] = useMemo(() => {
    const apiSlots = bestTimesData?.slots ?? [];
    if (apiSlots.length > 0) {
      return apiSlots
        .map((s) => ({
          day: s.day_of_week,
          hour: s.hour,
          engagement: s.avg_engagement ?? 0,
        }))
        .sort((a, b) => b.engagement - a.engagement);
    }
    if (platform && PLATFORM_CONFIG[platform]) {
      const defaults = PLATFORM_CONFIG[platform].defaultBestTimes;
      return defaults.map((s, i) => ({
        day: s.dayOfWeek,
        hour: s.hour,
        engagement: defaults.length - i,
      }));
    }
    return GENERIC_DEFAULT_SLOTS;
  }, [bestTimesData, platform]);

  // Default selection derives from the same `allSlots` as the pills, so they
  // can never disagree. When API data arrives, the default updates with it
  // (unless the user has already picked something — see `selectedDate/Time`
  // below).
  const defaultSelection = useMemo(
    () => findDefaultSelection(allSlots, now, today),
    [allSlots, now, today]
  );

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
        <button
          disabled={disabled}
          className="flex h-10 md:h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 px-3 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CalendarIcon className="h-3.5 w-3.5" />
          Schedule
        </button>
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
        <div className="border-t border-gray-100 px-4 py-3">
          <button
            onClick={handleConfirm}
            disabled={!selectedTime}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <CalendarIcon className="h-4 w-4" />
            {`Schedule for ${selectedDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })} at ${formatTimeLabel(selectedTime)}`}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
