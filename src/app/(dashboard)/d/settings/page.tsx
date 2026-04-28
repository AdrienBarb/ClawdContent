"use client";

import { useState, useMemo, useRef, useEffect, useId } from "react";
import { appRouter } from "@/lib/constants/appRouter";
import useApi from "@/lib/hooks/useApi";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/dashboard/PageHeader";
import { GlobeIcon, CheckIcon } from "@phosphor-icons/react";

const ALL_TIMEZONES = Intl.supportedValuesOf("timeZone");

interface DashboardStatus {
  timezone: string | null;
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
