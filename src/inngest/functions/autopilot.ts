import type { GetStepTools } from "inngest";
import { inngest } from "../client";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { computeInsights } from "@/lib/services/accountInsights";
import { computeStrategy } from "@/lib/services/socialStrategy";
import { parseStrategy } from "@/lib/schemas/strategy";
import {
  claimWeeklyBatch,
  failBatch,
  finalizeBatch,
  listAutopilotAccounts,
  markCommitPhase,
  MAX_BATCH_ATTEMPTS,
} from "@/lib/services/autopilot/batch";
import {
  planAccountWeek,
  MAX_REELS_PER_USER_WEEK,
  type PlannedSuggestion,
} from "@/lib/services/autopilot/planWeek";
import {
  sendWeeklyDigest,
  sendBatchFailedAlert,
} from "@/lib/services/autopilot/digest";
import {
  DEFAULT_TIMEZONE,
  getLocalParts,
  nextWeekStart,
} from "@/lib/services/autopilot/time";
import { getOrBuildStyleKit, type StyleKit } from "@/lib/media/styleKit";
import {
  renderStaticMedia,
  renderReelHero,
  persistReelVideo,
} from "@/lib/media/mediaPlan";
import {
  startReelGeneration,
  checkReelOperation,
} from "@/lib/media/geminiVideo";
import { fetchReferenceImage } from "@/lib/media/geminiImage";
import { publishOrScheduleSuggestion } from "@/lib/services/publishSuggestion";
import { SUPPORTED_PLATFORMS } from "@/lib/insights/platformConfig";
import { captureServerEvent } from "@/lib/tracking/postHogClient";
import type { BatchPostSnapshot } from "@/lib/schemas/autopilot";
import type { MediaItem } from "@/lib/schemas/mediaItems";

/**
 * The autopilot heartbeat (plan §4.3):
 *   autopilot-dispatch     — hourly cron; finds users whose local time is
 *                            Sunday 17:00, fans out one generate-week event
 *                            per user (event-id dedup per user+week+attempt).
 *   autopilot-generate-week — refresh insights → plan → generate media →
 *                            commit to Zernio → digest. Concurrency-keyed
 *                            per user; media steps return URLs only.
 */

const DISPATCH_LOCAL_HOUR = 17; // Sunday 17:00 user-local
const SUNDAY = 6; // 0=Monday convention
const REEL_POLL_MAX = 24; // × 20s ≈ 8 min ceiling (Veo worst case ~6 min)

export const autopilotDispatch = inngest.createFunction(
  {
    id: "autopilot-dispatch",
    retries: 2,
    triggers: [{ cron: "0 * * * *" }],
  },
  async ({ step }) => {
    const due = await step.run("find-due-users", async () => {
      const now = new Date();
      const users = await prisma.user.findMany({
        where: {
          autopilotPausedAt: null,
          onboardingCompletedAt: { not: null },
          subscription: { status: { in: ["active", "trialing"] } },
          lateProfile: {
            socialAccounts: {
              some: {
                status: "active",
                platform: { in: [...SUPPORTED_PLATFORMS] },
              },
            },
          },
        },
        select: { id: true, timezone: true },
      });

      const events: {
        userId: string;
        weekStart: string;
        coverFrom: string | null;
        localHour: number;
      }[] = [];
      for (const user of users) {
        const tz = user.timezone ?? DEFAULT_TIMEZONE;
        const local = getLocalParts(now, tz);
        // Active window: every Sunday hour from 17:00 local onward. Later
        // hours double as catch-up (cron outage at 17:00) and as the retry
        // lane for failed batches.
        if (local.weekday !== SUNDAY || local.hour < DISPATCH_LOCAL_HOUR) continue;

        const weekStart = nextWeekStart(now, tz);
        const existing = await prisma.weeklyBatch.findUnique({
          where: { userId_weekStart: { userId: user.id, weekStart } },
          select: { status: true, attempts: true, posts: true },
        });

        if (existing) {
          // A batch for the coming week exists: only failed batches with
          // retry budget that never reached the commit phase (posts === null)
          // are re-dispatched. claimWeeklyBatch enforces the same rules.
          if (
            existing.status !== "failed" ||
            existing.attempts >= MAX_BATCH_ATTEMPTS ||
            existing.posts !== null
          ) {
            continue;
          }
          events.push({
            userId: user.id,
            weekStart: weekStart.toISOString(),
            coverFrom: null,
            localHour: local.hour,
          });
          continue;
        }

        // No batch for the coming week yet. A recent batch (typically the
        // first week, generated mid-week at checkout) may already cover part
        // of it — plan only the uncovered remainder instead of stacking a
        // full second week (or leaving a multi-day gap).
        const latest = await prisma.weeklyBatch.findFirst({
          where: {
            userId: user.id,
            status: { in: ["generating", "ready"] },
            createdAt: { gt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000) },
          },
          orderBy: { createdAt: "desc" },
          select: { status: true, posts: true, createdAt: true },
        });

        let coverFrom: Date | null = null;
        if (latest) {
          if (latest.status === "generating") {
            // Still building (e.g. user subscribed minutes ago) — it will
            // cover the coming days; don't stack a second week on top.
            continue;
          }
          const covered = Array.isArray(latest.posts)
            ? (latest.posts as { scheduledAt?: string }[])
                .map((p) => (p.scheduledAt ? Date.parse(p.scheduledAt) : NaN))
                .filter((t) => Number.isFinite(t))
            : [];
          const coverageEnd = covered.length > 0 ? Math.max(...covered) : 0;
          const weekEnd = weekStart.getTime() + 6 * 24 * 60 * 60 * 1000;
          if (coverageEnd >= weekEnd) continue; // week fully covered
          if (coverageEnd > weekStart.getTime()) {
            coverFrom = new Date(coverageEnd + 60 * 60 * 1000);
          }
        }

        events.push({
          userId: user.id,
          weekStart: weekStart.toISOString(),
          coverFrom: coverFrom ? coverFrom.toISOString() : null,
          localHour: local.hour,
        });
      }
      return events;
    });

    if (due.length > 0) {
      await step.sendEvent(
        "fan-out",
        due.map((d) => ({
          // Hour suffix: retries/catch-ups later the same Sunday must not
          // collide with the original event id (Inngest dedupes ids for 24h),
          // and is bounded (≤7 dispatches/Sunday) regardless of DB state.
          id: `autopilot-${d.userId}-${d.weekStart}-h${d.localHour}`,
          name: "autopilot/generate-week",
          data: {
            userId: d.userId,
            weekStart: d.weekStart,
            reason: "weekly",
            ...(d.coverFrom ? { coverFrom: d.coverFrom } : {}),
          },
        }))
      );
    }

    return { dispatched: due.length };
  }
);

interface GenerateWeekEvent {
  data: {
    userId: string;
    weekStart: string;
    reason: "weekly" | "first_week";
    /** Plan only from this instant — earlier days are covered by a prior batch. */
    coverFrom?: string;
  };
}

export const autopilotGenerateWeek = inngest.createFunction(
  {
    id: "autopilot-generate-week",
    retries: 2,
    concurrency: [
      // Whole-fleet cap — Gemini image endpoints 503 under burst load.
      { limit: 6 },
      { key: "event.data.userId", limit: 1 },
    ],
    onFailure: async ({ event }) => {
      const original = (event.data.event as unknown as GenerateWeekEvent).data;
      if (!original?.userId) return;
      const weekStart = new Date(original.weekStart);
      const batch = await prisma.weeklyBatch.findUnique({
        where: {
          userId_weekStart: { userId: original.userId, weekStart },
        },
        select: { id: true, attempts: true, posts: true },
      });
      if (batch) {
        // Guarded transition — a batch already finalized "ready" (e.g. only
        // the digest send failed) must never be demoted, or the hourly
        // re-dispatch would re-plan and double-post the committed week.
        const transitioned = await failBatch({
          batchId: batch.id,
          error: "generation failed",
        });
        // Alert when no automatic retry will follow: first weeks have no
        // hourly retry lane, commit-phase batches are never re-armed, and
        // the attempt budget caps everything else.
        const willRetry =
          original.reason === "weekly" &&
          batch.attempts < MAX_BATCH_ATTEMPTS &&
          batch.posts === null;
        if (transitioned && !willRetry) {
          await sendBatchFailedAlert(original.userId);
        }
      }
      await captureServerEvent(original.userId, "autopilot_batch_failed", {
        weekStart: original.weekStart,
        reason: original.reason,
      });
    },
    triggers: [{ event: "autopilot/generate-week" }],
  },
  async ({ event, step }) => {
    const { userId, reason, coverFrom } = event.data as GenerateWeekEvent["data"];
    const weekStartISO = event.data.weekStart as string;

    // 1 — claim the batch (idempotency anchor; consumes pendingBrief)
    const batch = await step.run("claim-batch", () =>
      claimWeeklyBatch({ userId, weekStart: new Date(weekStartISO) })
    );
    if (!batch) {
      return { skipped: true, reason: "batch already ready or out of attempts" };
    }

    // 2 — eligible accounts
    const accounts = await step.run("list-accounts", () =>
      listAutopilotAccounts(userId)
    );
    if (accounts.length === 0) {
      await step.run("fail-no-accounts", () =>
        failBatch({ batchId: batch.id, error: "no connected accounts" })
      );
      return { skipped: true, reason: "no accounts" };
    }

    // 3 — refresh insights + ensure a strategy exists (never an empty plan)
    for (const account of accounts) {
      await step.run(`refresh-${account.id}`, async () => {
        try {
          await computeInsights(account.id, { source: "all" });
        } catch (err) {
          console.warn(
            `[autopilot] insights refresh failed for ${account.id}: ${err instanceof Error ? err.message : err}`
          );
        }
        try {
          const row = await prisma.socialAccount.findUnique({
            where: { id: account.id },
            select: { strategy: true },
          });
          if (!parseStrategy(row?.strategy)) {
            await computeStrategy(account.id);
          }
        } catch (err) {
          console.warn(
            `[autopilot] strategy ensure failed for ${account.id}: ${err instanceof Error ? err.message : err}`
          );
        }
        return account.id;
      });
    }

    // 4 — frozen style kit
    const kit = (await step.run("style-kit", () =>
      getOrBuildStyleKit(userId)
    )) as StyleKit;

    // 5 — plan each account's week (sequential: reel budget is per-user)
    let reelBudget = MAX_REELS_PER_USER_WEEK;
    const planned: PlannedSuggestion[] = [];
    for (const account of accounts) {
      const result = await step.run(`plan-${account.id}`, () =>
        planAccountWeek({
          userId,
          socialAccountId: account.id,
          batchId: batch.id,
          weekStart: new Date(batch.weekStart),
          brief: batch.brief,
          reelBudget,
          coverFrom: coverFrom ? new Date(coverFrom) : null,
        })
      );
      reelBudget = Math.max(0, reelBudget - result.reelsUsed);
      planned.push(...(result.planned as PlannedSuggestion[]));
    }

    // 6 — media, one asset pipeline per post (URLs only across steps)
    const mediaOutcome = new Map<
      string,
      { mediaUrl: string | null; mediaType: "image" | "video" | null; status: string }
    >();

    for (const post of planned) {
      if (post.mediaPlan.kind === "none") {
        mediaOutcome.set(post.suggestionId, {
          mediaUrl: null,
          mediaType: null,
          status: "draft",
        });
        continue;
      }

      if (post.mediaPlan.kind === "reel") {
        const outcome = await generateReelMedia({ step, post, batch, userId, kit });
        mediaOutcome.set(post.suggestionId, outcome);
        continue;
      }

      // photo / text_card / carousel — render attempt + one full retry
      let result = await step.run(`media-${post.suggestionId}`, () =>
        renderAndApplyStatic({ userId, batch, post, kit })
      );
      if (result.status === "failed") {
        result = await step.run(`media-retry-${post.suggestionId}`, () =>
          renderAndApplyStatic({ userId, batch, post, kit })
        );
      }
      if (result.status === "failed") {
        await step.run(`media-degrade-${post.suggestionId}`, () =>
          markNeedsMedia(post.suggestionId)
        );
        mediaOutcome.set(post.suggestionId, {
          mediaUrl: null,
          mediaType: null,
          status: "needs_media",
        });
        await step.run(`track-degraded-${post.suggestionId}`, () =>
          captureServerEvent(userId, "autopilot_media_degraded", {
            suggestionId: post.suggestionId,
            kind: post.mediaPlan.kind,
            to: "needs_media",
          })
        );
      } else {
        mediaOutcome.set(post.suggestionId, result);
        if (result.status === "needs_media") {
          await step.run(`track-ocr-held-${post.suggestionId}`, () =>
            captureServerEvent(userId, "autopilot_media_degraded", {
              suggestionId: post.suggestionId,
              kind: post.mediaPlan.kind,
              to: "needs_media",
              cause: "ocr_mismatch",
            })
          );
        }
      }
    }

    // 7 — commit (full auto) or stage (review)
    const isFullAuto = batch.mode !== "review";
    const commitOutcome = new Map<string, { externalPostId: string | null; status: string }>();

    if (isFullAuto) {
      // Commit-phase firewall: from here on the batch must never be re-armed
      // by the retry lane (live Zernio posts would be duplicated). The marker
      // is an empty posts array — claimWeeklyBatch refuses posts !== null.
      await step.run("mark-commit-phase", () => markCommitPhase(batch.id));

      for (const post of planned) {
        const media = mediaOutcome.get(post.suggestionId);
        if (media?.status === "needs_media") {
          commitOutcome.set(post.suggestionId, { externalPostId: null, status: "needs_media" });
          continue;
        }
        const commit = await step.run(`commit-${post.suggestionId}`, async () => {
          let result = await publishOrScheduleSuggestion({
            userId,
            suggestionId: post.suggestionId,
            action: "schedule",
          });
          // Step re-execution races the 5-minute soft lock from a crashed
          // earlier attempt — wait once and retry before declaring failure.
          if (!result.ok && result.error === "already_publishing") {
            await new Promise((r) => setTimeout(r, 10_000));
            result = await publishOrScheduleSuggestion({
              userId,
              suggestionId: post.suggestionId,
              action: "schedule",
            });
          }
          if (result.ok) {
            return { externalPostId: result.postId, status: "scheduled" };
          }
          // not_found here means a previous attempt already committed and
          // deleted the row (crash after finalizeAfterZernio) — the post is
          // live on Zernio; reporting "failed" would be wrong.
          if (result.error === "not_found") {
            return { externalPostId: null, status: "scheduled" };
          }
          console.warn(
            `[autopilot] commit failed suggestion=${post.suggestionId}: ${result.error}`
          );
          return { externalPostId: null, status: "failed" };
        });
        commitOutcome.set(post.suggestionId, commit);
      }
    } else {
      for (const post of planned) {
        const media = mediaOutcome.get(post.suggestionId);
        commitOutcome.set(post.suggestionId, {
          externalPostId: null,
          status: media?.status === "needs_media" ? "needs_media" : "staged",
        });
      }
    }

    // 8 — finalize: durable snapshot for digest / dashboard / actions
    const snapshots: BatchPostSnapshot[] = planned.map((post) => {
      const media = mediaOutcome.get(post.suggestionId);
      const commit = commitOutcome.get(post.suggestionId);
      const status = commit?.status ?? media?.status ?? "draft";
      return {
        // Kept even after the local row is deleted on commit — digest action
        // tokens minted against the staged id resolve through the snapshot.
        suggestionId: post.suggestionId,
        externalPostId: commit?.externalPostId ?? null,
        accountId: post.accountId,
        platform: post.platform,
        username: post.username,
        scheduledAt: post.scheduledAt,
        contentPreview: post.contentPreview,
        content: post.contentPreview,
        mediaUrl: media?.mediaUrl ?? null,
        mediaType: media?.mediaType ?? null,
        status,
        retriedAt: null,
      };
    });

    await step.run("finalize-batch", () =>
      finalizeBatch({ batchId: batch.id, posts: snapshots })
    );

    await step.run("track-generated", () =>
      captureServerEvent(userId, "autopilot_batch_generated", {
        batchId: batch.id,
        reason,
        mode: batch.mode,
        posts: snapshots.length,
        scheduled: snapshots.filter((s) => s.status === "scheduled").length,
        needsMedia: snapshots.filter((s) => s.status === "needs_media").length,
      })
    );

    // 9 — digest (~18:00 local on the weekly run; immediately for week 1).
    // The batch is already "ready": a digest failure must NEVER fail the run
    // (onFailure would demote the batch and the week could regenerate).
    if (reason === "weekly") {
      // weekStart is local Monday 00:00 → Sunday 18:00 local is 6h before.
      const digestAt = new Date(
        new Date(batch.weekStart).getTime() - 6 * 60 * 60 * 1000
      );
      if (digestAt.getTime() > Date.now()) {
        await step.sleepUntil("wait-digest-time", digestAt);
      }
    }
    const digestSent = await step.run("send-digest", async () => {
      try {
        await sendWeeklyDigest(batch.id);
        return true;
      } catch (err) {
        console.error(
          `[autopilot] digest send failed batch=${batch.id}: ${err instanceof Error ? err.message : err}`
        );
        return false;
      }
    });
    if (digestSent) {
      await step.run("track-digest", () =>
        captureServerEvent(userId, "autopilot_digest_sent", { batchId: batch.id })
      );
    }

    return {
      batchId: batch.id,
      posts: snapshots.length,
      scheduled: snapshots.filter((s) => s.status === "scheduled").length,
    };
  }
);

// ─── Step helpers ─────────────────────────────────────────────────

async function markNeedsMedia(suggestionId: string): Promise<void> {
  await prisma.postSuggestion
    .update({ where: { id: suggestionId }, data: { status: "needs_media" } })
    .catch(() => {});
}

async function applyMediaToSuggestion(
  suggestionId: string,
  mediaItems: MediaItem[],
  contentType: string
): Promise<void> {
  await prisma.postSuggestion
    .update({
      where: { id: suggestionId },
      data: {
        mediaItems: mediaItems as unknown as Prisma.InputJsonValue,
        contentType,
      },
    })
    .catch(() => {});
}

async function renderAndApplyStatic({
  userId,
  batch,
  post,
  kit,
}: {
  userId: string;
  batch: { id: string };
  post: PlannedSuggestion;
  kit: StyleKit;
}): Promise<{ mediaUrl: string | null; mediaType: "image" | "video" | null; status: string }> {
  const result = await renderStaticMedia({
    userId,
    batchId: batch.id,
    plan: post.mediaPlan,
    kit,
    aspectRatio: "4:5",
  });
  if (!result.ok || result.mediaItems.length === 0) {
    return { mediaUrl: null, mediaType: null, status: "failed" };
  }
  await applyMediaToSuggestion(
    post.suggestionId,
    result.mediaItems,
    post.mediaPlan.kind === "carousel" ? "carousel" : "image"
  );
  // OCR guard verdict is binding (founder decision: text QA on day 1). A
  // render that never matched its intended copy keeps its media attached for
  // the edit sheet but is held back from auto-publishing.
  if (!result.textVerified) {
    await prisma.postSuggestion
      .update({
        where: { id: post.suggestionId },
        data: { status: "needs_media" },
      })
      .catch(() => {});
    return {
      mediaUrl: result.mediaItems[0].url,
      mediaType: "image",
      status: "needs_media",
    };
  }
  return {
    mediaUrl: result.mediaItems[0].url,
    mediaType: "image",
    status: "draft",
  };
}

/**
 * Reel pipeline across steps: hero frame → start Veo → poll (sleep between
 * polls costs nothing) → persist MP4. Any failure degrades to the hero still
 * (IG posts never go out without media); hero failure → needs_media.
 */
async function generateReelMedia({
  step,
  post,
  batch,
  userId,
  kit,
}: {
  step: GetStepTools<typeof inngest>;
  post: PlannedSuggestion;
  batch: { id: string };
  userId: string;
  kit: StyleKit;
}): Promise<{ mediaUrl: string | null; mediaType: "image" | "video" | null; status: string }> {
  const id = post.suggestionId;

  let hero = await step.run(`reel-hero-${id}`, () =>
    renderReelHero({ userId, batchId: batch.id, plan: post.mediaPlan, kit })
  );
  if (!hero.ok || !hero.url) {
    hero = await step.run(`reel-hero-retry-${id}`, () =>
      renderReelHero({ userId, batchId: batch.id, plan: post.mediaPlan, kit })
    );
  }
  if (!hero.ok || !hero.url) {
    await step.run(`reel-degrade-${id}`, () => markNeedsMedia(id));
    await step.run(`track-reel-degraded-${id}`, () =>
      captureServerEvent(userId, "autopilot_media_degraded", {
        suggestionId: id,
        kind: "reel",
        to: "needs_media",
      })
    );
    return { mediaUrl: null, mediaType: null, status: "needs_media" };
  }
  const heroUrl = hero.url;

  const started = await step.run(`reel-start-${id}`, async () => {
    try {
      const frame = await fetchReferenceImage(heroUrl);
      if (!frame) throw new Error("hero frame fetch failed");
      const { operationName } = await startReelGeneration({
        prompt: post.mediaPlan.reelPrompt ?? "slow cinematic push-in",
        imageBase64: frame.data,
        imageMimeType: frame.mimeType,
      });
      return { operationName };
    } catch (err) {
      console.warn(
        `[autopilot] reel start failed suggestion=${id}: ${err instanceof Error ? err.message : err}`
      );
      return { operationName: null };
    }
  });

  let videoUri: string | null = null;
  if (started.operationName) {
    for (let i = 0; i < REEL_POLL_MAX; i++) {
      await step.sleep(`reel-wait-${id}-${i}`, "20s");
      const status = await step.run(`reel-poll-${id}-${i}`, () =>
        checkReelOperation(started.operationName!).catch((err) => ({
          done: true as const,
          error: err instanceof Error ? err.message : String(err),
        }))
      );
      if (status.done) {
        videoUri = "videoUri" in status ? (status.videoUri ?? null) : null;
        if ("error" in status && status.error) {
          console.warn(`[autopilot] reel failed suggestion=${id}: ${status.error}`);
        }
        break;
      }
    }
  }

  if (videoUri) {
    const saved = await step.run(`reel-save-${id}`, async () => {
      try {
        const { url } = await persistReelVideo({
          userId,
          batchId: batch.id,
          videoUri: videoUri!,
        });
        await applyMediaToSuggestion(id, [{ url, type: "video" }], "video");
        return { url };
      } catch (err) {
        console.warn(
          `[autopilot] reel persist failed suggestion=${id}: ${err instanceof Error ? err.message : err}`
        );
        return { url: null };
      }
    });
    if (saved.url) {
      return { mediaUrl: saved.url, mediaType: "video", status: "draft" };
    }
  }

  // Degrade: video → the hero still as a static image post.
  await step.run(`reel-fallback-${id}`, () =>
    applyMediaToSuggestion(id, [{ url: heroUrl, type: "image" }], "image")
  );
  await step.run(`track-reel-fallback-${id}`, () =>
    captureServerEvent(userId, "autopilot_media_degraded", {
      suggestionId: id,
      kind: "reel",
      to: "static_image",
    })
  );
  return { mediaUrl: heroUrl, mediaType: "image", status: "draft" };
}
