"use client";

import { useState, useMemo, useRef, useEffect } from "react";
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
  const containerRef = useRef<HTMLDivElement>(null);

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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

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
          <Input
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
            disabled={isPending}
          />

          {open && (
            <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-60 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="px-3 py-2 text-sm text-gray-400">
                  No timezones found
                </p>
              ) : (
                filtered.map((tz) => (
                  <button
                    key={tz}
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-2 text-sm text-left hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      updateTimezone({ timezone: tz });
                      setOpen(false);
                      setSearch("");
                    }}
                  >
                    <span className="text-gray-700">
                      {tz.replaceAll("_", " ")}
                    </span>
                    {tz === currentTimezone && (
                      <CheckIcon className="h-4 w-4 text-emerald-500 shrink-0" />
                    )}
                  </button>
                ))
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
