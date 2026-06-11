"use client";

import { useState, useMemo, useRef, useEffect, useId } from "react";
import { appRouter } from "@/lib/constants/appRouter";
import useApi from "@/lib/hooks/useApi";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/dashboard/PageHeader";
import {
  GlobeIcon,
  CheckIcon,
  SteeringWheelIcon,
} from "@phosphor-icons/react";

const ALL_TIMEZONES = Intl.supportedValuesOf("timeZone");

interface DashboardStatus {
  timezone: string | null;
  autopilot?: {
    mode: string;
    paused: boolean;
  };
}

export default function SettingsPage() {
  const { useGet, usePatch } = useApi();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const optionPrefix = useId();

  const {
    data: status,
    isLoading,
    refetch,
  } = useGet(appRouter.api.dashboardStatus) as {
    data: DashboardStatus | undefined;
    isLoading: boolean;
    refetch: () => void;
  };

  const { mutate: updateTimezone, isPending } = usePatch("/api/user/timezone", {
    onSuccess: () => refetch(),
  });

  const { mutate: updateAutopilot, isPending: autopilotPending } = usePatch(
    "/api/autopilot/settings",
    { onSuccess: () => refetch() }
  );

  const currentTimezone = status?.timezone;

  const filtered = useMemo(() => {
    if (!search) return ALL_TIMEZONES;
    const q = search.toLowerCase();
    return ALL_TIMEZONES.filter((tz) => tz.toLowerCase().includes(q));
  }, [search]);

  // Reset highlight when filter changes so ArrowDown lands on a real option.
  useEffect(() => {
    setHighlight(0);
  }, [search]);

  // Keep the highlighted option scrolled into view as the user arrows.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(
      `[data-option-index="${highlight}"]`
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [highlight, open]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const commitSelection = (tz: string) => {
    updateTimezone({ timezone: tz });
    setOpen(false);
    setSearch("");
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      setHighlight((h) => Math.min(h + 1, Math.max(filtered.length - 1, 0)));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
      return;
    }
    if (e.key === "Home") {
      e.preventDefault();
      setHighlight(0);
      return;
    }
    if (e.key === "End") {
      e.preventDefault();
      setHighlight(Math.max(filtered.length - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const tz = filtered[highlight];
      if (tz) commitSelection(tz);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      if (open) {
        setOpen(false);
        setSearch("");
      } else {
        inputRef.current?.blur();
      }
      return;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  const activeOptionId =
    open && filtered[highlight]
      ? `${optionPrefix}-option-${highlight}`
      : undefined;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        subtitle="Manage your account preferences."
      />

      <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
            <SteeringWheelIcon className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Autopilot</h3>
            <p className="text-xs text-gray-500">
              How your weekly posts get planned and published
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4 max-w-md">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-gray-900">
                Publish automatically
              </p>
              <p className="text-[12px] leading-relaxed text-gray-500">
                On: each week is scheduled as soon as it&apos;s ready — you can
                still veto or edit anything. Off: nothing publishes until you
                hit &ldquo;Launch my week&rdquo;.
              </p>
            </div>
            <button
              role="switch"
              aria-checked={status?.autopilot?.mode !== "review"}
              disabled={autopilotPending}
              onClick={() =>
                updateAutopilot({
                  mode:
                    status?.autopilot?.mode === "review"
                      ? "full_auto"
                      : "review",
                })
              }
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
                status?.autopilot?.mode !== "review"
                  ? "bg-[#2d2a25]"
                  : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                  status?.autopilot?.mode !== "review"
                    ? "translate-x-[22px]"
                    : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          <div className="flex items-start justify-between gap-4 border-t border-gray-100 pt-4">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-gray-900">
                Pause autopilot
              </p>
              <p className="text-[12px] leading-relaxed text-gray-500">
                No new weeks get planned while paused. Already-scheduled posts
                still go out unless you remove them.
              </p>
            </div>
            <button
              role="switch"
              aria-checked={status?.autopilot?.paused === true}
              disabled={autopilotPending}
              onClick={() =>
                updateAutopilot({ paused: !(status?.autopilot?.paused === true) })
              }
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
                status?.autopilot?.paused ? "bg-[#2d2a25]" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                  status?.autopilot?.paused
                    ? "translate-x-[22px]"
                    : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <GlobeIcon className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Timezone</h3>
            <p className="text-xs text-gray-500">
              Used for scheduling posts at the right time
            </p>
          </div>
        </div>

        <div ref={containerRef} className="relative max-w-sm">
          <label htmlFor={`${optionPrefix}-input`} className="sr-only">
            Timezone
          </label>
          <Input
            id={`${optionPrefix}-input`}
            ref={inputRef}
            placeholder="Search timezone..."
            value={open ? search : currentTimezone ?? ""}
            onChange={(e) => {
              setSearch(e.target.value);
              if (!open) setOpen(true);
            }}
            onFocus={() => {
              setOpen(true);
              setSearch("");
            }}
            onKeyDown={handleKeyDown}
            disabled={isPending}
            role="combobox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={activeOptionId}
          />

          {open && (
            <div
              ref={listRef}
              id={listboxId}
              role="listbox"
              aria-label="Timezones"
              className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-60 overflow-y-auto"
            >
              {filtered.length === 0 ? (
                <p className="px-3 py-2 text-sm text-gray-400">
                  No timezones found
                </p>
              ) : (
                filtered.map((tz, idx) => {
                  const isHighlighted = idx === highlight;
                  const isSelected = tz === currentTimezone;
                  return (
                    <div
                      key={tz}
                      id={`${optionPrefix}-option-${idx}`}
                      data-option-index={idx}
                      role="option"
                      aria-selected={isSelected}
                      onMouseDown={(e) => {
                        // Prevent input blur from closing the listbox before click fires.
                        e.preventDefault();
                      }}
                      onMouseEnter={() => setHighlight(idx)}
                      onClick={() => commitSelection(tz)}
                      className={`flex items-center justify-between px-3 py-2 text-sm cursor-pointer ${
                        isHighlighted ? "bg-gray-100" : "hover:bg-gray-50"
                      }`}
                    >
                      <span className="text-gray-700">
                        {tz.replaceAll("_", " ")}
                      </span>
                      {isSelected && (
                        <CheckIcon className="h-4 w-4 text-emerald-500 shrink-0" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {currentTimezone && (
          <p className="mt-3 text-xs text-gray-400">
            Current: {currentTimezone.replaceAll("_", " ")}
          </p>
        )}
      </div>
    </div>
  );
}
