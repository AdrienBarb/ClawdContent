import { inngest } from "../client";
import { prisma } from "@/lib/db/prisma";
import { computeInsights } from "@/lib/services/accountInsights";
import { createFromBrief } from "@/lib/services/createFromBrief";

async function markAnalysisCompleted(socialAccountId: string): Promise<void> {
  await prisma.socialAccount.updateMany({
    where: { id: socialAccountId },
    data: { analysisStatus: "completed" },
  });
}

// v2 first-batch generation. Intentionally relaxes the "never generate from
// Inngest" rule documented in src/lib/services/CLAUDE.md — see postclaw-mvp.md
// for the autopublish MVP contract. Atomic via lastSuggestionsGeneratedAt CAS
// so concurrent account/connected events (IG + FB during onboarding) collapse
// to a single batch.
async function generateFirstBatchIfEligible(userId: string): Promise<void> {
  const claim = await prisma.user.updateMany({
    where: {
      id: userId,
      version: "v2",
      firstBatchApproved: false,
      lastSuggestionsGeneratedAt: null,
    },
    data: { lastSuggestionsGeneratedAt: new Date() },
  });
  if (claim.count === 0) return;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      timezone: true,
      lateProfile: {
        select: {
          socialAccounts: {
            where: { status: "active" },
            select: { id: true },
          },
        },
      },
    },
  });
  const accountIds = user?.lateProfile?.socialAccounts.map((a) => a.id) ?? [];
  if (accountIds.length === 0) {
    // Release the claim so a later connection can trigger generation.
    await prisma.user.update({
      where: { id: userId },
      data: { lastSuggestionsGeneratedAt: null },
    });
    return;
  }

  const scheduledAtList = buildScheduledAtList(5, user?.timezone ?? null);

  const brief = `Write 5 posts that introduce this business to its audience. Friendly, professional tone. Each post should be self-contained and standalone. Cover different angles: what the business does, who it serves, a small behind-the-scenes detail, a tip the audience would value, and an invitation to connect.`;

  try {
    await createFromBrief({
      userId,
      accountIds,
      brief,
      count: 5,
      scheduledAtList,
    });
  } catch (err) {
    // Release the claim on hard failure so Inngest retries can re-attempt.
    await prisma.user
      .update({
        where: { id: userId },
        data: { lastSuggestionsGeneratedAt: null },
      })
      .catch(() => undefined);
    throw err;
  }
}

function buildScheduledAtList(count: number, timezone: string | null): Date[] {
  const tz = timezone ?? "UTC";
  const dates: Date[] = [];
  const now = new Date();

  // Resolve today's local calendar date in the user's tz (handles DST + tz
  // boundary correctly even when UTC and local are on different days).
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const todayParts = fmt.formatToParts(now);
  const todayY = Number(todayParts.find((p) => p.type === "year")?.value);
  const todayM = Number(todayParts.find((p) => p.type === "month")?.value);
  const todayD = Number(todayParts.find((p) => p.type === "day")?.value);

  for (let i = 0; i < count; i++) {
    // Anchor to UTC midnight of the local-tomorrow+i date, then bump by the
    // tz offset at that date (so DST transitions inside the 5-day window are
    // honoured).
    const anchor = new Date(Date.UTC(todayY, todayM - 1, todayD));
    anchor.setUTCDate(anchor.getUTCDate() + i + 1);
    const offsetMinutes = getTimezoneOffsetMinutes(tz, anchor);
    anchor.setUTCMinutes(10 * 60 - offsetMinutes);
    dates.push(anchor);
  }
  return dates;
}

function getTimezoneOffsetMinutes(timezone: string, at: Date): number {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "shortOffset",
    });
    const parts = fmt.formatToParts(at);
    const name = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
    if (name === "GMT" || name === "UTC") return 0;
    const match = name.match(/GMT([+\-−])(\d{1,2})(?::(\d{2}))?/);
    if (!match) return 0;
    const sign = match[1] === "+" ? 1 : -1;
    const hours = Number(match[2]);
    const minutes = Number(match[3] ?? 0);
    return sign * (hours * 60 + minutes);
  } catch {
    return 0;
  }
}

export const analyzeAccount = inngest.createFunction(
  { id: "analyze-account", retries: 3, triggers: [{ event: "account/connected" }] },
  async ({ event, step }) => {
    const { socialAccountId, userId } = event.data as {
      socialAccountId: string;
      userId?: string;
    };

    // First pass — Zernio may still be backfilling, in which case insights
    // come back with syncTriggered=true and the post list is shallow.
    let insights = await step.run("compute-insights", async () => {
      return computeInsights(socialAccountId, { source: "external" });
    });

    // If Zernio kicked off a sync, wait once and recompute on the better data.
    // We do NOT recurse on syncTriggered — at most one retry, then we accept
    // whatever data we have (no infinite loop). Skipped if the first pass
    // returned null (account deleted between event and processing).
    if (insights?.meta.syncTriggered) {
      console.log(
        `[analyze-account] ⏳ syncTriggered=true, waiting 60s for Zernio backfill (socialAccountId=${socialAccountId})`
      );
      await step.sleep("wait-for-sync", "60s");

      const refreshed = await step.run("compute-insights-after-sync", async () => {
        return computeInsights(socialAccountId, { source: "external" });
      });

      if (refreshed !== null) insights = refreshed;
    }

    // Always flip to "completed" — markAnalysisCompleted is a no-op when the
    // row has been deleted, and unconditionally clearing the flag prevents the
    // dashboard from sticking on "analyzing" if computeInsights ever returns
    // null for a reason other than account-not-found.
    await step.run("mark-analysis-completed", async () => {
      await markAnalysisCompleted(socialAccountId);
    });

    if (userId) {
      await step.run("generate-first-batch", async () => {
        await generateFirstBatchIfEligible(userId);
      });
    }

    return {
      success: true,
      socialAccountId,
      ...(insights === null ? { skipped: "account-not-found" } : {}),
    };
  }
);

// Refreshes insights only — never regenerates suggestions. Fired on reconnect
// (accounts.ts) and by the backfill-insights script. Suggestions are only ever
// (re)generated when the user explicitly asks ("Get ideas" or from a brief).
export const refreshInsights = inngest.createFunction(
  { id: "refresh-insights", retries: 2, triggers: [{ event: "account/refresh-insights" }] },
  async ({ event, step }) => {
    const { socialAccountId } = event.data as { socialAccountId: string };

    await step.run("compute-insights", async () => {
      return computeInsights(socialAccountId, { source: "all" });
    });

    // Idempotent: no-op for "completed" accounts, upgrades "pending" accounts
    // (e.g. backfill-insights script) to "completed".
    await step.run("mark-analysis-completed", async () => {
      await markAnalysisCompleted(socialAccountId);
    });

    return { success: true, socialAccountId };
  }
);
