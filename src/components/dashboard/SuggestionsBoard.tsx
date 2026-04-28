"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ResultsView } from "./publish/ResultsView";
import type { Suggestion } from "./publish/types";
import type { MediaItem } from "@/lib/schemas/mediaItems";
import { fetchData } from "@/lib/hooks/useApi";

interface AccountInfo {
  id: string;
  platform: string;
  username: string;
}

interface SuggestionsResponse {
  suggestions: Suggestion[];
}

export const SUGGESTIONS_QUERY_KEY = ["suggestions"] as const;

interface Props {
  accounts: AccountInfo[];
  onEdit: (s: Suggestion) => void;
  onLimitReached: () => void;
  onPublishedOrScheduled?: () => void;
  /** Free posts remaining; null = unlimited (subscribed). */
  quotaRemaining: number | null;
}

function formatScheduleLabel(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function SuggestionsBoard({
  accounts,
  onEdit,
  onLimitReached,
  onPublishedOrScheduled,
  quotaRemaining,
}: Props) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<SuggestionsResponse>({
    queryKey: SUGGESTIONS_QUERY_KEY,
    queryFn: () => fetchData("/api/suggestions"),
  });

  const suggestions = data?.suggestions ?? [];

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: SUGGESTIONS_QUERY_KEY });
  };

  const handleSchedule = async (
    id: string,
    scheduledAt: string | null,
    opts?: { silent?: boolean }
  ): Promise<boolean> => {
    const res = await fetch(`/api/suggestions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduledAt }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.message ?? "Couldn't update the schedule. Try again.");
      return false;
    }
    if (!opts?.silent) {
      invalidate();
      if (scheduledAt === null) {
        toast.success("Schedule cleared");
      } else {
        toast.success(`Scheduled for ${formatScheduleLabel(scheduledAt)}`);
      }
    }
    return true;
  };

  const commitWithErrorMapping = async (
    s: Suggestion,
    action: "publish" | "schedule",
    opts?: { silent?: boolean }
  ): Promise<boolean> => {
    const res = await fetch(`/api/suggestions/${s.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      if (body?.error === "FREE_POST_LIMIT_REACHED") {
        // Always surface — opening the SubscribeModal is idempotent and the
        // user has no other path back from a server-side rejection mid-bulk.
        onLimitReached();
        return false;
      }
      if (body?.error === "VALIDATION_FAILED" && body.validationErrors) {
        if (!opts?.silent) {
          for (const e of body.validationErrors) {
            toast.error(`${e.platform}: ${e.error}`);
          }
        }
        return false;
      }
      if (body?.error === "NO_SCHEDULE_STAGED") {
        if (!opts?.silent) toast.error(body.message);
        return false;
      }
      if (body?.error === "SCHEDULE_IN_PAST") {
        // Clear the stale staged time so the CTA reverts to "Post" instead
        // of trapping the user in a perpetually-rejecting "Schedule" loop.
        await fetch(`/api/suggestions/${s.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scheduledAt: null }),
        }).catch(() => {});
        invalidate();
        if (!opts?.silent) {
          toast.error("That time has passed — schedule cleared.");
        }
        return false;
      }
      if (!opts?.silent) {
        toast.error(
          body?.message ??
            (action === "publish"
              ? "Failed to publish post"
              : "Failed to schedule post")
        );
      }
      return false;
    }
    return true;
  };

  const handleAction = async (
    action: string,
    s: Suggestion,
    opts?: { silent?: boolean }
  ): Promise<boolean> => {
    if (action === "delete") {
      const res = await fetch(`/api/suggestions/${s.id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Couldn't delete that post. Try again.");
        return false;
      }
      if (!opts?.silent) {
        toast.success("Post deleted");
        invalidate();
      }
      return true;
    }
    if (action === "publish") {
      const ok = await commitWithErrorMapping(s, "publish", opts);
      if (!ok) return false;
      if (!opts?.silent) {
        toast.success("Post published");
        invalidate();
        onPublishedOrScheduled?.();
      }
      return true;
    }
    if (action === "schedule") {
      const ok = await commitWithErrorMapping(s, "schedule", opts);
      if (!ok) return false;
      if (!opts?.silent) {
        toast.success("Post scheduled");
        invalidate();
        onPublishedOrScheduled?.();
      }
      return true;
    }
    return false;
  };

  const handleBulkComplete = (publishedOrScheduledCount: number) => {
    invalidate();
    if (publishedOrScheduledCount > 0) {
      onPublishedOrScheduled?.();
    }
  };

  const handleMediaChanged = async (id: string, mediaItems: MediaItem[]) => {
    const res = await fetch(`/api/suggestions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaItems }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.message ?? "Couldn't save the media. Try again.");
      return;
    }
    invalidate();
    toast.success("Media updated");
  };

  if (isLoading || suggestions.length === 0) return null;

  const accountLites = accounts.map((a) => ({
    id: a.id,
    platform: a.platform,
    username: a.username,
  }));

  return (
    <ResultsView
      embedded
      accounts={accountLites}
      suggestions={suggestions}
      onEdit={onEdit}
      onSchedule={handleSchedule}
      onAction={handleAction}
      onMediaChanged={handleMediaChanged}
      onBulkComplete={handleBulkComplete}
      quotaRemaining={quotaRemaining}
    />
  );
}
