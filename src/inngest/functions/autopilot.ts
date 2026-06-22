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
} from "@/lib/services/autopilot/time";
import { computeDueAnchor } from "@/lib/services/autopilot/schedule";
import { getOrBuildStyleKit, type StyleKit } from "@/lib/media/styleKit";
import {
  renderStaticMedia,
  renderReelHero,
  persistReelVideo,
  deriveFeedStillFromUrl,
} from "@/lib/media/mediaPlan";
import {
  startReelGeneration,
  checkReelOperation,
} from "@/lib/media/geminiVideo";
import { fetchReferenceImage } from "@/lib/media/geminiImage";
import {
  publishOrScheduleSuggestion,
  validateSuggestionPublishable,
} from "@/lib/services/publishSuggestion";
import { SUPPORTED_PLATFORMS } from "@/lib/insights/platformConfig";
import { captureServerEvent } from "@/lib/tracking/postHogClient";
import type { BatchPostSnapshot } from "@/lib/schemas/autopilot";
import type { MediaItem } from "@/lib/schemas/mediaItems";

/**
 * The autopilot heartbeat (rolling per-user weeks):
 *   autopilot-dispatch     — hourly cron; for each eligible user, computes
 *                            their next rolling 7-day window (anchored on their
 *                            first-generation day, +7d each cycle) and fans out
 *                            a generate-week event the evening before the window
 *                            starts (event-id dedup per user+anchor+date+hour).
 *   autopilot-generate-week — refresh insights → plan → generate media →
 *                            commit to Zernio → digest. Concurrency-keyed
 *                            per user; media steps return URLs only.
 */

const DISPATCH_LOCAL_HOUR = 17; // generate a window the evening before it starts
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

      const events: { userId: string; weekStart: string; eventId: string }[] = [];
      for (const user of users) {
        const tz = user.timezone ?? DEFAULT_TIMEZONE;

        // Each user rolls on their own anchor: advance 7 days from their last
        // window, retry a failed one, or bootstrap if none exists yet.
        const latest = await prisma.weeklyBatch.findFirst({
          where: { userId: user.id },
          orderBy: { weekStart: "desc" },
          select: {
            weekStart: true,
            status: true,
            attempts: true,
            posts: true,
            updatedAt: true,
          },
        });

        const decision = computeDueAnchor({
          latest: latest
            ? {
                weekStart: latest.weekStart,
                status: latest.status,
                attempts: latest.attempts,
                posts: latest.posts,
                updatedAt: latest.updatedAt,
              }
            : null,
          now,
          timeZone: tz,
          dispatchHour: DISPATCH_LOCAL_HOUR,
          maxAttempts: MAX_BATCH_ATTEMPTS,
        });
        if (!decision.due) continue;

        // A batch for the target window may already exist (created on an
        // earlier tick): only re-dispatch a failed one with retry budget that
        // never reached commit. claimWeeklyBatch enforces the same rules.
        const existing = await prisma.weeklyBatch.findUnique({
          where: {
            userId_weekStart: { userId: user.id, weekStart: decision.anchor },
          },
          select: { status: true, attempts: true, posts: true },
        });
        if (existing) {
          if (
            existing.status !== "failed" ||
            existing.attempts >= MAX_BATCH_ATTEMPTS ||
            existing.posts !== null
          ) {
            continue;
          }
        }

        // Event id dedupes redeliveries: the anchor is fixed per window; the
        // local date+hour suffix lets the hourly retry/catch-up lane re-fire
        // across hours and days (Inngest dedupes ids for 24h) without
        // colliding, bounded by the attempt cap.
        const local = getLocalParts(now, tz);
        const dateStr = `${local.year}${String(local.month).padStart(2, "0")}${String(
          local.day
        ).padStart(2, "0")}`;
        const anchorISO = decision.anchor.toISOString();
        events.push({
          userId: user.id,
          weekStart: anchorISO,
          eventId: `autopilot-${user.id}-${anchorISO}-${dateStr}h${local.hour}`,
        });
      }
      return events;
    });

    if (due.length > 0) {
      await step.sendEvent(
        "fan-out",
        due.map((d) => ({
          id: d.eventId,
          name: "autopilot/generate-week",
          data: {
            userId: d.userId,
            weekStart: d.weekStart,
            reason: "recurring",
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
    // The rolling window's anchor (local midnight) AND the WeeklyBatch
    // idempotency key — planning uses it directly, no separate planAnchor.
    weekStart: string;
    // "recurring" = hourly cron rolling window (has a retry lane). "first_week"
    // = checkout. "manual" = user "generate now". first_week + manual have no
    // re-dispatch lane, so onFailure alerts rather than waits.
    reason: "recurring" | "first_week" | "manual";
  };
}

export const autopilotGenerateWeek = inngest.createFunction(
  {
    id: "autopilot-generate-week",
    retries: 2,
    concurrency: [
      // Whole-fleet cap — Gemini image endpoints 503 under burst load, and the
      // Inngest plan allows at most 5 concurrent runs per function.
      { limit: 5 },
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
        // Alert when no automatic retry will follow: first-week and manual
        // runs have no hourly retry lane, commit-phase batches are never
        // re-armed, and the attempt budget caps everything else.
        const willRetry =
          original.reason === "recurring" &&
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
    const { userId, reason } = event.data as GenerateWeekEvent["data"];
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

    // 5 — plan each account's rolling 7-day week (sequential: reel budget is
    // per-user). weekStart is both the batch key and the planning anchor.
    const weekStart = new Date(batch.weekStart);
    let reelBudget = MAX_REELS_PER_USER_WEEK;
    const planned: PlannedSuggestion[] = [];
    for (const account of accounts) {
      const result = await step.run(`plan-${account.id}`, () =>
        planAccountWeek({
          userId,
          socialAccountId: account.id,
          batchId: batch.id,
          weekStart,
          brief: batch.brief,
          reelBudget,
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

    // 6b — publishability gate. A post only stays a committable draft if it
    // ALREADY passes Zernio's validation (aspect ratio, caption length, media
    // rules) with its FINAL rendered media. Anything that wouldn't publish is
    // held back as needs_media — so the commit phase (full_auto) and "Launch my
    // week" (review) can never hit a swallowed validation_failed. AI output is
    // supposed to be publishable; this guarantees it before anything commits.
    for (const post of planned) {
      const media = mediaOutcome.get(post.suggestionId);
      if (!media || media.status !== "draft") continue; // only gate committable posts
      const verdict = await step.run(`validate-${post.suggestionId}`, () =>
        validateSuggestionPublishable({ userId, suggestionId: post.suggestionId })
      );
      if (!verdict.ok) {
        await step.run(`gate-degrade-${post.suggestionId}`, () =>
          markNeedsMedia(post.suggestionId)
        );
        mediaOutcome.set(post.suggestionId, {
          mediaUrl: media.mediaUrl,
          mediaType: media.mediaType,
          status: "needs_media",
        });
        console.warn(
          `[autopilot:gate] held suggestion=${post.suggestionId} (${post.platform}): ${verdict.reason}`
        );
        await step.run(`track-gate-held-${post.suggestionId}`, () =>
          captureServerEvent(userId, "autopilot_media_degraded", {
            suggestionId: post.suggestionId,
            kind: post.mediaPlan.kind,
            to: "needs_media",
            cause: "validation_failed",
          })
        );
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

    // 9 — digest. The dispatch fires the evening before the window starts, so
    // the digest goes out immediately after finalize (no in-function wait).
    // The batch is already "ready": a digest failure must NEVER fail the run
    // (onFailure would demote the batch and the week could regenerate).
    // Skip entirely for an empty batch — never send a "here's your week" email
    // with zero posts.
    const digestSent =
      snapshots.length === 0
        ? false
        : await step.run("send-digest", async () => {
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

  // Degrade: video → a FEED-SAFE 4:5 still derived from the 9:16 hero. The raw
  // hero is 9:16 (Reel/Story dims) which Instagram REJECTS as a feed image
  // (allowed feed aspect 0.8–1.91; 9:16 ≈ 0.56) — committing it verbatim makes
  // an un-publishable post that fails validation forever. The hero is photoreal
  // with no on-image text, so a centre-crop to 4:5 is safe.
  const still = await step.run(`reel-fallback-${id}`, async () => {
    // Best quality: a FRESH 4:5 photoreal still composed for the feed from the
    // same scene. The 9:16 hero is framed for vertical, so centre-cropping it
    // can clip the subject — re-rendering at 4:5 composes for the feed instead.
    try {
      const fresh = await renderStaticMedia({
        userId,
        batchId: batch.id,
        plan: {
          kind: "photo",
          imagePrompt:
            post.mediaPlan.imagePrompt ?? post.mediaPlan.reelPrompt ?? "",
        },
        kit,
        aspectRatio: "4:5",
      });
      if (fresh.ok && fresh.mediaItems.length > 0) {
        await applyMediaToSuggestion(id, fresh.mediaItems, "image");
        return { url: fresh.mediaItems[0].url };
      }
    } catch (err) {
      console.warn(
        `[autopilot] reel fresh-4:5 still failed suggestion=${id}: ${err instanceof Error ? err.message : err}`
      );
    }
    // Fallback: cover-crop the existing 9:16 hero to a feed-safe 4:5. Still
    // publishable (the original bug was committing the raw 9:16); composition
    // is the only tradeoff vs the fresh render above.
    try {
      const url = await deriveFeedStillFromUrl({
        userId,
        batchId: batch.id,
        sourceUrl: heroUrl,
      });
      await applyMediaToSuggestion(id, [{ url, type: "image" }], "image");
      return { url };
    } catch (err) {
      console.warn(
        `[autopilot] reel still-degrade failed suggestion=${id}: ${err instanceof Error ? err.message : err}`
      );
      return { url: null };
    }
  });
  if (!still.url) {
    // Couldn't produce a feed-safe still → hold back rather than commit the
    // un-publishable 9:16 hero as a feed image.
    await step.run(`reel-degrade2-${id}`, () => markNeedsMedia(id));
    await step.run(`track-reel-degraded2-${id}`, () =>
      captureServerEvent(userId, "autopilot_media_degraded", {
        suggestionId: id,
        kind: "reel",
        to: "needs_media",
        cause: "still_derive_failed",
      })
    );
    return { mediaUrl: null, mediaType: null, status: "needs_media" };
  }
  await step.run(`track-reel-fallback-${id}`, () =>
    captureServerEvent(userId, "autopilot_media_degraded", {
      suggestionId: id,
      kind: "reel",
      to: "static_image",
    })
  );
  return { mediaUrl: still.url, mediaType: "image", status: "draft" };
}
