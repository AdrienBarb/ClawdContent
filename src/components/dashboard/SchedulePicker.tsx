"use client";

import { useMemo, useState } from "react";
import { CalendarIcon, CheckIcon, ClockIcon } from "@phosphor-icons/react";
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
}

interface NormalizedSlot {
  day: number; // 0=Mon..6=Sun (matches Zernio + PLATFORM_CONFIG)
  hour: number;
}

const GENERIC_DEFAULT_SLOTS: NormalizedSlot[] = [
  { day: 1, hour: 10 },
  { day: 3, hour: 13 },
  { day: 5, hour: 17 },
];

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

function formatTimeLabel(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const hour = h % 12 || 12;
  const ampm = h < 12 ? "AM" : "PM";
  return `${hour}:${pad2(m)} ${ampm}`;
}

// JS getDay() is Sun=0..Sat=6; project data is Mon=0..Sun=6.
function dayOfWeekZernio(date: Date): number {
  return (date.getDay() + 6) % 7;
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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>("");

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

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const allSlots: NormalizedSlot[] = useMemo(() => {
    const apiSlots = bestTimesData?.slots ?? [];
    if (apiSlots.length > 0) {
      return apiSlots.map((s) => ({ day: s.day_of_week, hour: s.hour }));
    }
    if (platform && PLATFORM_CONFIG[platform]) {
      return PLATFORM_CONFIG[platform].defaultBestTimes.map((s) => ({
        day: s.dayOfWeek,
        hour: s.hour,
      }));
    }
    return GENERIC_DEFAULT_SLOTS;
  }, [bestTimesData, platform]);

  const slotsForSelectedDay: NormalizedSlot[] = useMemo(() => {
    if (!selectedDate) return [];
    const d = dayOfWeekZernio(selectedDate);
    return allSlots
      .filter((s) => s.day === d)
      .sort((a, b) => a.hour - b.hour)
      .slice(0, 3);
  }, [selectedDate, allSlots]);

  const handleSelectDate = (d: Date | undefined) => {
    setSelectedDate(d);
    if (!d) return;
    if (selectedTime) return;
    const dz = dayOfWeekZernio(d);
    const earliest = allSlots
      .filter((s) => s.day === dz)
      .sort((a, b) => a.hour - b.hour)[0];
    setSelectedTime(earliest ? `${pad2(earliest.hour)}:00` : "10:00");
  };

  const handleConfirm = () => {
    if (!selectedDate || !selectedTime) return;
    const [h, m] = selectedTime.split(":").map(Number);
    const date = new Date(selectedDate);
    date.setHours(h, m, 0, 0);
    onSchedule(date);
    setOpen(false);
    setSelectedDate(undefined);
    setSelectedTime("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          disabled={disabled}
          className="flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 px-3 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CalendarIcon className="h-3.5 w-3.5" />
          Schedule
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="z-[70] w-[340px] rounded-2xl border border-gray-200 bg-white p-0 shadow-lg"
      >
        {/* Calendar */}
        <div className="px-4 pb-2 pt-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleSelectDate}
            disabled={{ before: today }}
            showOutsideDays={false}
            captionLayout="label"
            className="w-full p-0 [--cell-size:2.25rem]"
            classNames={{
              months: "flex flex-col gap-3",
              month: "flex w-full flex-col gap-3",
              month_caption:
                "relative flex h-8 w-full items-center justify-start",
              caption_label: "text-sm font-semibold text-gray-900",
              nav: "absolute right-0 top-0 flex items-center gap-1",
              button_previous:
                "h-7 w-7 inline-flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 transition-colors",
              button_next:
                "h-7 w-7 inline-flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 transition-colors",
              weekdays: "flex w-full",
              weekday:
                "flex-1 text-center text-[11px] font-medium text-gray-400 uppercase tracking-wide",
              week: "flex w-full mt-1",
              day: "flex-1 aspect-square p-0",
            }}
            components={{
              DayButton: ({ day, modifiers, className, ...buttonProps }) => (
                <button
                  {...buttonProps}
                  data-day={day.date.toLocaleDateString()}
                  className={cn(
                    "mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition-colors",
                    modifiers.selected &&
                      "bg-gray-900 text-white hover:bg-gray-900",
                    !modifiers.selected &&
                      !modifiers.disabled &&
                      "text-gray-700 hover:bg-gray-100",
                    !modifiers.selected &&
                      modifiers.today &&
                      "font-semibold text-[#e8614d]",
                    modifiers.disabled &&
                      "cursor-not-allowed text-gray-300 hover:bg-transparent",
                    className
                  )}
                />
              ),
            }}
          />
        </div>

        {/* Posting Slots */}
        <div className="border-t border-gray-100 px-4 py-3">
          <p className="mb-2 text-xs font-semibold text-gray-700">
            Posting Slots
          </p>
          {!selectedDate ? (
            <p className="text-xs text-gray-400">
              Select a date to see best times.
            </p>
          ) : slotsForSelectedDay.length === 0 ? (
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
                    onClick={() => setSelectedTime(time)}
                    className={cn(
                      "flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                      isSelected
                        ? "border-gray-900 bg-gray-50 text-gray-900"
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
          <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 focus-within:border-gray-300">
            <ClockIcon className="h-4 w-4 text-gray-400" />
            <input
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="flex-1 bg-transparent text-sm text-gray-900 focus:outline-none"
            />
            {timezone && (
              <span className="ml-auto truncate text-xs text-gray-400">
                {timezone}
              </span>
            )}
          </label>
        </div>

        {/* Confirm */}
        <div className="flex justify-end px-4 pb-3 pt-1">
          <button
            onClick={handleConfirm}
            disabled={!selectedDate || !selectedTime}
            className="cursor-pointer text-xs font-semibold text-gray-900 transition-opacity hover:underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-30"
          >
            Schedule
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
