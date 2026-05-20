import type { GetStepTools, Inngest } from "inngest";
import { inngest } from "../client";
import { prisma } from "@/lib/db/prisma";
import {
  generateWeekForAccount,
  type GenerateWeekResult,
} from "@/lib/services/weekGenerate";
import { scheduleSuggestionToZernio } from "@/lib/services/scheduleSuggestion";

type StepTools = GetStepTools<Inngest.Any>;

const RATE_LIMIT_BACKOFF = "5m";

const ACTIVE_SUBSCRIPTION_STATUSES = ["active", "trialing"];

async function loadEligibleUserIds(): Promise<string[]> {
  const rows = await prisma.user.findMany({
    where: {
      subscription: {
        status: { in: ACTIVE_SUBSCRIPTION_STATUSES },
      },
      lateProfile: {
        socialAccounts: {
          some: { generationEnabled: true, status: "active" },
        },
      },
    },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

async function loadEligibleAccountIdsForUser(userId: string): Promise<string[]> {
  const rows = await prisma.socialAccount.findMany({
    where: {
      generationEnabled: true,
      status: "active",
      strategyDefinedAt: { not: null },
      lateProfile: { userId },
    },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

/**
 * Step 1 — global cron fanout. Fires Sunday 18:00 UTC weekly. We don't try to
 * do anything heavy here: list eligible users and send a per-user event each,
 * letting Inngest parallelize the per-user work and isolate any failures.
 *
 * The per-user function then translates the cron into the user's local
 * timezone via `User.timezone` (default UTC) when computing `weekStart`.
 */
export const weeklyGenerateFanout = inngest.createFunction(
  {
    id: "weekly-generate-fanout",
    retries: 1,
    triggers: [{ cron: "0 18 * * 0" }],
  },
  async ({ step }) => {
    const userIds = await step.run("list-eligible-users", async () => {
      return loadEligibleUserIds();
    });

    if (userIds.length === 0) {
      console.log("[weeklyGenerateFanout] no eligible users — exiting");
      return { fanout: 0 };
    }

    await step.sendEvent(
      "fanout-users",
      userIds.map((userId) => ({
        name: "weekly/generate-for-user" as const,
        data: { userId },
      }))
    );

    console.log(`[weeklyGenerateFanout] fanned out to ${userIds.length} users`);
    return { fanout: userIds.length };
  }
);

async function runWithRateLimitRetry(args: {
  step: StepTools;
  accountId: string;
}): Promise<GenerateWeekResult> {
  const result = await args.step.run(
    `generate-${args.accountId}`,
    async () => generateWeekForAccount(args.accountId, new Date())
  );

  if (result.rateLimitedSuggestionIds.length === 0) return result;

  console.log(
    `[weeklyGenerate] backing off ${RATE_LIMIT_BACKOFF} for ${result.rateLimitedSuggestionIds.length} rate-limited suggestions on accountId=${args.accountId}`
  );
  await args.step.sleep(`backoff-${args.accountId}`, RATE_LIMIT_BACKOFF);

  let recovered = 0;
  const stillFailed: string[] = [];
  for (const suggestionId of result.rateLimitedSuggestionIds) {
    const retry = await args.step.run(
      `retry-${suggestionId}`,
      async () => scheduleSuggestionToZernio(suggestionId)
    );
    if (retry.ok) {
      recovered += 1;
    } else {
      stillFailed.push(suggestionId);
      console.warn(
        `[weeklyGenerate] retry still failed suggestion=${suggestionId} error=${retry.error}`
      );
    }
  }

  return {
    ...result,
    scheduled: result.scheduled + recovered,
    rateLimitedSuggestionIds: [],
    failedSuggestionIds: [...result.failedSuggestionIds, ...stillFailed],
  };
}

/**
 * Step 2 — per-user week generator. Triggered by the cron fanout. Iterates
 * the user's eligible accounts (generation enabled, has a strategy) and
 * drives `generateWeekForAccount` per account, with a single durable 5-min
 * retry pass on Zernio rate-limits.
 */
export const weeklyGenerateForUser = inngest.createFunction(
  {
    id: "weekly-generate-for-user",
    retries: 2,
    concurrency: { key: "event.data.userId", limit: 1 },
    triggers: [{ event: "weekly/generate-for-user" }],
  },
  async ({ event, step }) => {
    const { userId } = event.data as { userId: string };

    const accountIds = await step.run("list-accounts", async () => {
      return loadEligibleAccountIdsForUser(userId);
    });

    if (accountIds.length === 0) {
      console.log(
        `[weeklyGenerateForUser] no eligible accounts for userId=${userId}`
      );
      return { userId, accounts: 0 };
    }

    let created = 0;
    let scheduled = 0;
    let withImage = 0;
    const failed: string[] = [];
    for (const accountId of accountIds) {
      const result = await runWithRateLimitRetry({ step, accountId });
      created += result.created;
      scheduled += result.scheduled;
      withImage += result.withImage;
      failed.push(...result.failedSuggestionIds);
    }

    console.log(
      `[weeklyGenerateForUser] ✓ userId=${userId} accounts=${accountIds.length} created=${created} scheduled=${scheduled} withImage=${withImage} failed=${failed.length}`
    );

    return {
      userId,
      accounts: accountIds.length,
      created,
      scheduled,
      withImage,
      failed: failed.length,
    };
  }
);

async function assertAccountOwner(
  socialAccountId: string,
  expectedUserId: string
): Promise<boolean> {
  const row = await prisma.socialAccount.findUnique({
    where: { id: socialAccountId },
    select: { lateProfile: { select: { userId: true } } },
  });
  if (!row) return false;
  return row.lateProfile.userId === expectedUserId;
}

/**
 * Step 3 — single-account first-week kick-off. Fired by `analyze-account`
 * after a freshly-connected account finishes its initial strategy pass, so
 * a user who connects on Saturday doesn't have to wait until Sunday 18:00
 * UTC to see their first batch of posts.
 *
 * Defense-in-depth: the event payload must include the claimed `userId`,
 * which we verify against the loaded account's owner before doing any work.
 * Without this, any actor able to send Inngest events could trigger OpenAI
 * + Zernio writes against any tenant's account.
 */
export const generateFirstWeekForAccount = inngest.createFunction(
  {
    id: "generate-first-week-for-account",
    retries: 2,
    concurrency: { key: "event.data.socialAccountId", limit: 1 },
    triggers: [{ event: "account/generate-week" }],
  },
  async ({ event, step }) => {
    const { socialAccountId, userId } = event.data as {
      socialAccountId?: unknown;
      userId?: unknown;
    };

    if (
      typeof socialAccountId !== "string" ||
      typeof userId !== "string" ||
      socialAccountId.length === 0 ||
      userId.length === 0
    ) {
      console.warn(
        `[generateFirstWeekForAccount] rejected — invalid event payload`
      );
      return { rejected: "invalid-payload" };
    }

    const owned = await step.run("verify-owner", async () =>
      assertAccountOwner(socialAccountId, userId)
    );
    if (!owned) {
      console.warn(
        `[generateFirstWeekForAccount] rejected — userId=${userId} does not own socialAccountId=${socialAccountId}`
      );
      return { rejected: "owner-mismatch" };
    }

    const result = await runWithRateLimitRetry({ step, accountId: socialAccountId });

    console.log(
      `[generateFirstWeekForAccount] ✓ socialAccountId=${socialAccountId} created=${result.created} scheduled=${result.scheduled} withImage=${result.withImage}`
    );

    return {
      socialAccountId,
      created: result.created,
      scheduled: result.scheduled,
      withImage: result.withImage,
      failed: result.failedSuggestionIds.length,
      skipped: result.skipped,
    };
  }
);
