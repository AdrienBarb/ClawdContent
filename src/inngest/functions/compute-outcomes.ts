import { inngest } from "../client";
import { prisma } from "@/lib/db/prisma";
import { getAnalytics } from "@/lib/late/mutations";
import { computeOutcomeSnapshot } from "@/lib/services/outcomesAnalysis";

const ANALYTICS_WINDOW_DAYS = 14;
const ANALYTICS_PAGE_LIMIT = 100;

/**
 * Nightly cron that aggregates posts-only outcomes for every user with
 * ≥5 published posts. Result is upserted into OutcomeSnapshot and read
 * once per chat session by the chat route. Per-user step.run isolates
 * Zernio failures so one bad apiKey doesn't kill the whole run.
 *
 * Security note: lateApiKey is a per-tenant secret. We deliberately do NOT
 * return it from any step.run — Inngest persists step inputs/outputs in its
 * run history, so leaking it there would expose every tenant's key. The
 * candidate list step returns userIds only; each per-user step re-fetches
 * the apiKey from the database.
 */
export const computeOutcomes = inngest.createFunction(
  {
    id: "compute-outcomes",
    retries: 2,
    triggers: [{ cron: "0 3 * * *" }],
  },
  async ({ step }) => {
    const candidateIds = await step.run("list-candidates", async () => {
      const rows = await prisma.user.findMany({
        where: {
          postsPublished: { gte: 5 },
          lateProfile: { isNot: null },
        },
        select: { id: true },
      });
      return rows.map((r) => r.id);
    });

    let updated = 0;
    let skipped = 0;
    let failed = 0;

    const since = new Date(Date.now() - ANALYTICS_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const fromDate = since.toISOString();

    for (const userId of candidateIds) {
      try {
        const outcome = await step.run(`compute-${userId}`, async () => {
          const profile = await prisma.lateProfile.findUnique({
            where: { userId },
            select: { lateApiKey: true },
          });
          if (!profile?.lateApiKey) return "skipped" as const;

          const analytics = await getAnalytics(profile.lateApiKey, {
            fromDate,
            limit: ANALYTICS_PAGE_LIMIT,
            sortBy: "publishedAt",
            order: "desc",
            source: "all",
          });

          const snapshot = computeOutcomeSnapshot(analytics.posts);
          if (!snapshot) return "skipped" as const;

          // JSON columns require InputJsonValue. Our typed shapes are
          // structurally JSON-safe but Prisma's type doesn't accept them
          // without an explicit hop through unknown.
          const json = {
            topPerformers: snapshot.topPerformers as unknown as object,
            underperformers: snapshot.underperformers as unknown as object,
            patterns: snapshot.patterns as unknown as object,
            failedPosts: snapshot.failedPosts as unknown as object,
          };

          await prisma.outcomeSnapshot.upsert({
            where: { userId },
            create: {
              userId,
              publishedCount: snapshot.publishedCount,
              ...json,
            },
            update: {
              computedAt: new Date(),
              publishedCount: snapshot.publishedCount,
              ...json,
            },
          });
          return "updated" as const;
        });

        if (outcome === "updated") updated += 1;
        else skipped += 1;
      } catch (err) {
        failed += 1;
        // Do NOT log the whole error object — Zernio SDK errors can echo
        // request headers including the API key. Log the message only.
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[compute-outcomes] failed userId=${userId}: ${msg}`);
      }
    }

    return {
      candidates: candidateIds.length,
      updated,
      skipped,
      failed,
    };
  }
);
