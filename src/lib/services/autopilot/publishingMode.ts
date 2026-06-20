import "server-only";
import { prisma } from "@/lib/db/prisma";
import { deletePost, getPost } from "@/lib/late/mutations";
import { coerceMediaItems, type MediaItem } from "@/lib/schemas/mediaItems";
import type { BatchPostSnapshot } from "@/lib/schemas/autopilot";
import { approveBatch } from "./approve";
import { updateBatchPostSnapshot } from "./batch";

export type PublishingState = "full_auto" | "review" | "paused";

export type SetPublishingModeResult =
  | {
      ok: true;
      effect: "none" | "committed" | "reverted";
      count: number;
      skipped?: number;
      /** full_auto commit: posts held back as needs_media (un-publishable). */
      held?: number;
      /** full_auto commit: posts that hit a transient publish error. */
      failed?: number;
    }
  | { ok: false; error: string };

// Best-effort single-flight guard per user. The UI disables the select while a
// request is in flight, but a double-submit before that latches (or a second
// tab on the same instance) could otherwise run two reverts against the same
// week concurrently. Cross-instance races stay masked by Zernio's delete
// erroring on an already-deleted post; this kills the common same-instance one.
const inFlight = new Set<string>();

/**
 * Changes the publishing mode AND re-buckets the CURRENT week so the
 * Scheduled / Need-review counts reflect the choice immediately:
 *   → full_auto: commit any staged (review) week now  (= "Launch my week")
 *   → review:    pull this week's not-yet-published scheduled posts back to
 *                drafts (un-schedules them from Zernio so they stop going out)
 *   → paused:    stop planning new weeks AND pull this week's still-scheduled
 *                posts back off Zernio so nothing goes out while paused
 * The user setting itself stays forward-looking (governs next week too).
 */
export async function setPublishingMode({
  userId,
  state,
}: {
  userId: string;
  state: PublishingState;
}): Promise<SetPublishingModeResult> {
  if (inFlight.has(userId)) {
    console.warn(`[autopilot:mode] user=${userId} state=${state} REJECTED — another mode change is already in flight`);
    return { ok: false, error: "in_progress" };
  }
  inFlight.add(userId);
  console.log(`[autopilot:mode] user=${userId} → requested state=${state}`);
  try {
    // 1 — forward-looking user setting.
    const data: { autopilotMode?: string; autopilotPausedAt?: Date | null } = {};
    if (state === "paused") {
      data.autopilotPausedAt = new Date();
    } else {
      data.autopilotMode = state;
      data.autopilotPausedAt = null; // picking a live mode also resumes
    }
    await prisma.user.update({ where: { id: userId }, data });
    console.log(`[autopilot:mode] user=${userId} user setting saved (${JSON.stringify(data)})`);

    // 2 — current-week effect on the latest batch (shared by all three modes).
    const batch = await prisma.weeklyBatch.findFirst({
      where: { userId },
      orderBy: { weekStart: "desc" },
      select: { id: true, status: true, mode: true, approvedAt: true },
    });
    if (!batch || batch.status !== "ready") {
      console.log(
        `[autopilot:mode] user=${userId} no actionable current week (batch=${batch?.id ?? "none"}, status=${batch?.status ?? "n/a"}) — effect=none`
      );
      return { ok: true, effect: "none", count: 0 };
    }
    console.log(
      `[autopilot:mode] user=${userId} latest batch=${batch.id} status=${batch.status} mode=${batch.mode} approvedAt=${batch.approvedAt ? batch.approvedAt.toISOString() : "null"}`
    );

    if (state === "full_auto") {
      // Commit a staged review week so it stops "needing review". The mode
      // setting already flipped (forward-looking); a per-post commit problem
      // must NOT fail the switch — un-publishable posts are held back and
      // surfaced as a count so the user can fix them, the rest still commit.
      if (batch.mode === "review" && !batch.approvedAt) {
        const staged = await prisma.postSuggestion.count({
          where: { batchId: batch.id, status: "draft" },
        });
        console.log(
          `[autopilot:mode] user=${userId} → full_auto: ${staged} staged draft(s) in batch=${batch.id}`
        );
        if (staged > 0) {
          console.log(`[autopilot:mode] user=${userId} committing staged week via approveBatch…`);
          const res = await approveBatch({ userId, batchId: batch.id });
          if (!res.ok) {
            // Pre-condition only (not_found / already_approved) — the mode
            // already flipped, so report no current-week effect rather than
            // failing the switch and desyncing the UI from the saved setting.
            console.warn(
              `[autopilot:mode] user=${userId} approveBatch precondition for batch=${batch.id}: ${res.error}`
            );
            return { ok: true, effect: "none", count: 0 };
          }
          console.log(
            `[autopilot:mode] user=${userId} committed batch=${batch.id}: scheduled=${res.scheduled} held=${res.held} failed=${res.failed}`
          );
          return {
            ok: true,
            effect: "committed",
            count: res.scheduled,
            held: res.held,
            failed: res.failed,
          };
        }
      }
      console.log(`[autopilot:mode] user=${userId} → full_auto: nothing to commit — effect=none`);
      return { ok: true, effect: "none", count: 0 };
    }

    // state === "review" OR "paused": pull this week's still-scheduled posts
    // back off Zernio so nothing auto-publishes. Review re-arms the week for
    // approval; pause additionally stops planning new weeks (set in step 1).
    console.log(
      `[autopilot:mode] user=${userId} → ${state}: pulling committed week back off the Zernio schedule…`
    );
    const { pulled, skipped } = await revertWeekToReview({
      userId,
      batchId: batch.id,
    });
    console.log(
      `[autopilot:mode] user=${userId} → ${state} DONE for batch=${batch.id}: pulled=${pulled} skipped=${skipped}`
    );
    return { ok: true, effect: "reverted", count: pulled, skipped };
  } finally {
    inFlight.delete(userId);
  }
}

/** 0=Monday … 6=Sunday + local hour, derived from a scheduled time in `tz`. */
function dayHourInTz(date: Date | null, tz: string): { day: number; hour: number } {
  if (!date) return { day: 0, hour: 9 };
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    hour: "numeric",
    hour12: false,
  }).formatToParts(date);
  const wd = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const hourRaw = parseInt(
    parts.find((p) => p.type === "hour")?.value ?? "9",
    10
  );
  const map: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };
  const hour = Number.isFinite(hourRaw) ? hourRaw % 24 : 9;
  return { day: map[wd] ?? 0, hour };
}

/**
 * Pull every still-scheduled (not-yet-published) committed post of a batch off
 * the Zernio schedule and back into a local review draft. Returns how many were
 * pulled back and how many were left in place (already live / unreachable).
 *
 * Safety, per post:
 *  - Allowlist guard: only an untouched `scheduled` (no publishedAt) Zernio post
 *    is pulled. Anything published / partial / in-flight stays put — it may
 *    already be out, and deleting+recreating it would re-publish a live post.
 *  - Media is preserved exactly; if even one carousel slide can't be kept, the
 *    post is left scheduled rather than recreated media-less (IG never commits
 *    without media).
 *  - The draft is created BEFORE the Zernio post is removed (a draft never
 *    auto-publishes), and on a delete failure the orphan draft is rolled back —
 *    so a failure leaves the post safely scheduled, never lost and never doubled.
 */
async function revertWeekToReview({
  userId,
  batchId,
}: {
  userId: string;
  batchId: string;
}): Promise<{ pulled: number; skipped: number }> {
  const [profile, batch, user, accounts] = await Promise.all([
    prisma.lateProfile.findUnique({
      where: { userId },
      select: { lateApiKey: true },
    }),
    prisma.weeklyBatch.findUnique({
      where: { id: batchId },
      select: { posts: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    }),
    prisma.socialAccount.findMany({
      where: { lateProfile: { userId } },
      select: { id: true, lateAccountId: true },
    }),
  ]);
  if (!profile || !batch || !Array.isArray(batch.posts)) {
    console.warn(
      `[autopilot:revert] user=${userId} batch=${batchId} aborted — missing prerequisites (profile=${!!profile}, batch=${!!batch}, posts=${Array.isArray(batch?.posts)})`
    );
    return { pulled: 0, skipped: 0 };
  }

  const snapshots = batch.posts as unknown as BatchPostSnapshot[];
  const tz = user?.timezone ?? "UTC";
  const accountIdByLate = new Map(accounts.map((a) => [a.lateAccountId, a.id]));

  const scheduledCount = snapshots.filter((s) => s.status === "scheduled").length;
  console.log(
    `[autopilot:revert] user=${userId} batch=${batchId}: ${snapshots.length} snapshot(s), ${scheduledCount} scheduled to pull back, ${accounts.length} connected account(s), tz=${tz}`
  );

  let pulled = 0;
  let skipped = 0;

  for (const snap of snapshots) {
    if (snap.status !== "scheduled") continue;
    // Committed posts whose live id we lost (a crash after commit) are live on
    // the schedule but unreachable here — surface them rather than pretend.
    if (!snap.externalPostId) {
      skipped += 1;
      console.warn(
        `[autopilot:revert] SKIP suggestion=${snap.suggestionId ?? "?"} — scheduled snapshot has no externalPostId (live on schedule but unreachable)`
      );
      continue;
    }
    const socialAccountId = accountIdByLate.get(snap.accountId);
    if (!socialAccountId) {
      skipped += 1;
      console.warn(
        `[autopilot:revert] SKIP post=${snap.externalPostId} — no connected SocialAccount maps to lateAccountId=${snap.accountId}`
      );
      continue;
    }

    let draftId: string | null = null;
    let deleted = false;
    try {
      // The snapshot only carries a 140-char preview; the Zernio post has the
      // full caption + the complete (carousel) media set, all on our storage.
      const post = await getPost(snap.externalPostId, profile.lateApiKey);
      console.log(
        `[autopilot:revert] post=${snap.externalPostId} fetched from Zernio: status=${post.status} publishedAt=${post.publishedAt ?? "null"} media=${post.mediaItems.length}`
      );

      // Allowlist: only pull back a post that is unambiguously still pending.
      if (post.status !== "scheduled" || post.publishedAt) {
        skipped += 1;
        console.warn(
          `[autopilot:revert] SKIP post=${snap.externalPostId} — not safely pullable (Zernio status=${post.status}, publishedAt=${post.publishedAt ?? "null"}); leaving it on the schedule`
        );
        continue;
      }

      const mapped: MediaItem[] = post.mediaItems.map((m) => ({
        url: m.url,
        type: m.type === "video" ? "video" : "image",
      }));
      // coerceMediaItems is all-or-nothing, so validate per item and keep what
      // passes. If anything would be dropped, leave the post scheduled instead
      // of recreating a media-less draft that would re-publish empty.
      const mediaItems = mapped.filter(
        (m) => coerceMediaItems([m]).length === 1
      );
      if (mapped.length > 0 && mediaItems.length !== mapped.length) {
        skipped += 1;
        console.warn(
          `[autopilot:revert] SKIP post=${snap.externalPostId} — ${mapped.length - mediaItems.length}/${mapped.length} media item(s) failed validation; leaving scheduled rather than recreating media-less`
        );
        continue;
      }

      const contentType = mediaItems.some((m) => m.type === "video")
        ? "video"
        : mediaItems.length > 1
          ? "carousel"
          : mediaItems.length === 1
            ? "image"
            : "text";
      const scheduledAt = snap.scheduledAt ? new Date(snap.scheduledAt) : null;
      const { day, hour } = dayHourInTz(scheduledAt, tz);

      // Create the holding row as "reverting", NOT a committable "draft". A
      // draft never auto-publishes, but approveBatch / the digest "Launch my
      // week" link select status:"draft" and bypass this function's lock — so
      // a committable draft existing while the live Zernio post still exists is
      // a double-commit window. "reverting" is invisible to every commit path;
      // it's promoted to "draft" only once the post is off the schedule below.
      const draft = await prisma.postSuggestion.create({
        data: {
          socialAccountId,
          content: post.content,
          contentType,
          suggestedDay: day,
          suggestedHour: hour,
          scheduledAt,
          batchId,
          status: "reverting",
          ...(mediaItems.length > 0 ? { mediaItems } : {}),
        },
        select: { id: true },
      });
      draftId = draft.id;
      console.log(
        `[autopilot:revert] post=${snap.externalPostId} → holding row ${draftId} created (status=reverting, contentType=${contentType}); deleting from Zernio…`
      );

      await deletePost(snap.externalPostId, profile.lateApiKey);
      deleted = true;
      console.log(`[autopilot:revert] post=${snap.externalPostId} deleted from Zernio schedule`);

      // Live post is gone — now it's safe to make the row a launchable draft.
      await prisma.postSuggestion.update({
        where: { id: draftId },
        data: { status: "draft" },
      });
      await updateBatchPostSnapshot(
        batchId,
        { externalPostId: snap.externalPostId },
        { status: "staged", suggestionId: draftId, externalPostId: null }
      );
      pulled += 1;
      console.log(
        `[autopilot:revert] PULLED post=${snap.externalPostId} → draft ${draftId} (status: scheduled → staged)`
      );
    } catch (err) {
      if (draftId) {
        if (!deleted) {
          // The delete never happened → the post is still scheduled. Drop the
          // holding row so it can't surface or ever be committed (no double).
          await prisma.postSuggestion
            .delete({ where: { id: draftId } })
            .catch(() => {});
          console.warn(
            `[autopilot:revert] FAILED post=${snap.externalPostId} BEFORE delete → rolled back holding row ${draftId}; post stays SCHEDULED on Zernio. Cause: ${err instanceof Error ? err.message : err}`
          );
        } else {
          // The post was already removed from Zernio → keep it by promoting the
          // holding row to a launchable draft (no double: the live post is gone).
          await prisma.postSuggestion
            .update({ where: { id: draftId }, data: { status: "draft" } })
            .catch(() => {});
          console.warn(
            `[autopilot:revert] FAILED post=${snap.externalPostId} AFTER delete → Zernio post is GONE; promoted holding row ${draftId} to draft to avoid loss. Cause: ${err instanceof Error ? err.message : err}`
          );
        }
      } else {
        // Failed before the holding row existed (e.g. getPost threw) — nothing
        // local to clean up; the post is still scheduled on Zernio.
        console.warn(
          `[autopilot:revert] FAILED post=${snap.externalPostId} during fetch/prepare (no holding row created); post stays SCHEDULED on Zernio. Cause: ${err instanceof Error ? err.message : err}`
        );
      }
      skipped += 1;
    }
  }

  // Re-arm review mode so the timeline shows "Launch my week" again.
  await prisma.weeklyBatch.update({
    where: { id: batchId },
    data: { mode: "review", approvedAt: null },
  });
  console.log(
    `[autopilot:revert] user=${userId} batch=${batchId} complete: pulled=${pulled} skipped=${skipped}; batch re-armed to review mode`
  );

  return { pulled, skipped };
}
