import "server-only";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { isSupportedPlatform } from "@/lib/insights/platformConfig";
import {
  publishOrScheduleSuggestion,
  type PublishResult,
  type PublishAction,
} from "@/lib/services/publishSuggestion";
import type { MediaItem } from "@/lib/schemas/mediaItems";

interface CommitArgs {
  userId: string;
  accountId: string;
  content: string;
  mediaItems?: MediaItem[];
  action: PublishAction;
  scheduledAt?: string; // ISO — required for "schedule"
}

const WEEKDAY_TO_IDX: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

// suggestedDay/Hour are non-null metadata columns; derive them from the commit
// time read in the user's timezone (0=Monday to match the rest of the app).
function deriveSlot(at: Date, tz: string): { day: number; hour: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(at);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const hour = parts.find((p) => p.type === "hour")?.value ?? "12";
  return { day: WEEKDAY_TO_IDX[weekday] ?? 0, hour: parseInt(hour, 10) % 24 };
}

function contentTypeFor(mediaItems: MediaItem[]): string {
  if (mediaItems.length === 0) return "text";
  if (mediaItems.some((m) => m.type === "video")) return "video";
  if (mediaItems.length > 1) return "carousel";
  return "image";
}

/**
 * Commit an ephemeral /explore post. The generator never persists a draft, so
 * we lazy-create a PostSuggestion row here, hand it to the shared publish
 * pipeline (paywall / validation / Zernio / idempotency), and — on failure —
 * delete the row so nothing lingers in My Week. On success the pipeline's
 * finalizeAfterZernio already deleted it.
 */
export async function commitComposedPost({
  userId,
  accountId,
  content,
  mediaItems = [],
  action,
  scheduledAt,
}: CommitArgs): Promise<PublishResult> {
  const account = await prisma.socialAccount.findFirst({
    where: { id: accountId, status: "active", lateProfile: { userId } },
    include: {
      lateProfile: { select: { user: { select: { timezone: true } } } },
    },
  });
  if (!account || !isSupportedPlatform(account.platform)) {
    return { ok: false, error: "not_found" };
  }

  if (action === "schedule") {
    if (!scheduledAt) return { ok: false, error: "no_schedule_staged" };
    if (new Date(scheduledAt).getTime() <= Date.now()) {
      return { ok: false, error: "schedule_in_past" };
    }
  }

  const tz = account.lateProfile.user?.timezone ?? "UTC";
  const scheduledDate =
    action === "schedule" && scheduledAt ? new Date(scheduledAt) : null;
  const slot = deriveSlot(scheduledDate ?? new Date(), tz);

  const row = await prisma.postSuggestion.create({
    data: {
      socialAccountId: accountId,
      content,
      contentType: contentTypeFor(mediaItems),
      suggestedDay: slot.day,
      suggestedHour: slot.hour,
      status: "draft",
      ...(mediaItems.length > 0
        ? { mediaItems: mediaItems as unknown as Prisma.InputJsonValue }
        : {}),
      ...(scheduledDate ? { scheduledAt: scheduledDate } : {}),
    },
  });

  let result: PublishResult;
  try {
    result = await publishOrScheduleSuggestion({
      userId,
      suggestionId: row.id,
      action,
    });
  } catch (err) {
    // publishOrScheduleSuggestion shouldn't throw on expected failures, but an
    // unexpected DB/Zernio error must not strand the lazily-created row.
    await deleteSuggestion(row.id);
    console.error(`[explore:commit] publish threw for suggestion=${row.id}`, err);
    return {
      ok: false,
      error: "publish_failed",
      message: err instanceof Error ? err.message : "Publish failed",
    };
  }

  // Keep the flow ephemeral: drop the row on any failure AND on a partial
  // success (the post is live on Zernio but finalizeAfterZernio's delete tx
  // didn't commit) — otherwise it lingers in My Week. A clean success already
  // deleted it.
  if (!result.ok || result.partial) {
    await deleteSuggestion(row.id);
  }

  return result;
}

async function deleteSuggestion(id: string): Promise<void> {
  try {
    await prisma.postSuggestion.delete({ where: { id } });
  } catch (err) {
    console.error(
      `[explore:commit] cleanup delete failed for suggestion=${id}`,
      err
    );
  }
}
