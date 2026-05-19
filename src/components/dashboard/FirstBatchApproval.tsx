"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { SpinnerGapIcon } from "@phosphor-icons/react";
import { fetchData } from "@/lib/hooks/useApi";
import { SUGGESTIONS_QUERY_KEY } from "./publish/queryKeys";
import { getPlatform } from "@/lib/constants/platforms";
import type { Suggestion } from "./publish/types";

interface SuggestionsResponse {
  suggestions: Suggestion[];
}

const FORMATTER = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  hour: "numeric",
  minute: "2-digit",
});

export default function FirstBatchApproval() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<SuggestionsResponse>({
    queryKey: SUGGESTIONS_QUERY_KEY,
    queryFn: () => fetchData("/api/suggestions"),
    refetchInterval: (query) => {
      const count = query.state.data?.suggestions?.length ?? 0;
      return count === 0 ? 5000 : false;
    },
  });

  const suggestions = useMemo(() => data?.suggestions ?? [], [data]);
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const approvedCount = useMemo(
    () => suggestions.filter((s) => !skipped.has(s.id)).length,
    [suggestions, skipped]
  );

  if (isLoading || suggestions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <SpinnerGapIcon className="h-8 w-8 animate-spin text-[#ec6f5b]" />
        <p className="mt-4 text-sm text-gray-600">
          We&apos;re learning your account and writing your first week...
        </p>
        <p className="mt-1 text-xs text-gray-400">
          This usually takes 30–60 seconds.
        </p>
      </div>
    );
  }

  const toggleSkip = (id: string) => {
    setSkipped((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSchedule = async () => {
    if (submitting) return;
    const approvedIds = suggestions
      .filter((s) => !skipped.has(s.id))
      .map((s) => s.id);
    const skippedIds = Array.from(skipped);

    if (approvedIds.length === 0) {
      toast.error("Pick at least one post to schedule.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/onboarding/approve-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvedIds, skippedIds }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.error ?? "Couldn't schedule the batch. Try again.");
        return;
      }
      const firstApproved = suggestions.find((s) => !skipped.has(s.id));
      const when = firstApproved?.scheduledAt
        ? FORMATTER.format(new Date(firstApproved.scheduledAt))
        : null;
      toast.success(
        when
          ? `You're set. First post: ${when}.`
          : `Scheduled ${body.scheduled} posts.`
      );
      qc.invalidateQueries({ queryKey: SUGGESTIONS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: ["dashboardStatus"] });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Network error";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl py-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Your first week is ready
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Review the {suggestions.length} posts. Toggle off any you don&apos;t
          want, then schedule the rest.
        </p>
      </div>

      <div className="mt-8 space-y-3">
        {suggestions.map((s) => {
          const platform = getPlatform(s.socialAccount.platform);
          const isSkipped = skipped.has(s.id);
          const isExpanded = expanded.has(s.id);
          const truncated =
            s.content.length > 280 && !isExpanded
              ? s.content.slice(0, 280) + "…"
              : s.content;
          const when = s.scheduledAt
            ? FORMATTER.format(new Date(s.scheduledAt))
            : null;

          return (
            <div
              key={s.id}
              className={`relative overflow-hidden rounded-2xl border bg-white pl-4 pr-5 py-4 shadow-sm transition-opacity ${
                isSkipped ? "opacity-50" : ""
              } border-gray-200`}
            >
              <span
                className="absolute left-0 top-0 h-full w-[3px]"
                style={{ backgroundColor: platform?.color ?? "#9ca3af" }}
              />
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-lg text-white"
                    style={{ backgroundColor: platform?.color ?? "#9ca3af" }}
                  >
                    {platform?.icon}
                  </span>
                  <span className="text-[13px] font-medium text-gray-700">
                    @{s.socialAccount.username}
                  </span>
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-[12px] text-gray-500">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 cursor-pointer rounded border-gray-300"
                    checked={isSkipped}
                    onChange={() => toggleSkip(s.id)}
                  />
                  Skip this post
                </label>
              </div>

              <p className="mt-3 whitespace-pre-wrap text-[13px] leading-relaxed text-gray-900">
                {truncated}
              </p>
              {s.content.length > 280 && (
                <button
                  type="button"
                  onClick={() => toggleExpanded(s.id)}
                  className="mt-1 text-[11px] text-gray-500 hover:text-gray-700"
                >
                  {isExpanded ? "Show less" : "Show more"}
                </button>
              )}

              {when && (
                <p className="mt-3 text-[11px] uppercase tracking-[0.08em] text-gray-400">
                  Scheduled · {when}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="sticky bottom-6 mt-8 flex justify-center">
        <Button
          onClick={handleSchedule}
          disabled={submitting || approvedCount === 0}
          className="text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_1px_2px_rgba(200,74,53,0.25)]"
          style={{
            background:
              "linear-gradient(180deg, #ec6f5b 0%, #c84a35 100%)",
          }}
        >
          {submitting ? (
            <>
              <SpinnerGapIcon className="mr-2 h-4 w-4 animate-spin" />
              Scheduling...
            </>
          ) : (
            <>Schedule {approvedCount} post{approvedCount === 1 ? "" : "s"}</>
          )}
        </Button>
      </div>
    </div>
  );
}
