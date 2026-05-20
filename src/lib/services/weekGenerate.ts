import "server-only";
import { prisma } from "@/lib/db/prisma";
import { createFromBrief } from "@/lib/services/createFromBrief";
import {
  scheduleSuggestionToZernio,
  type ScheduleSuggestionResult,
} from "@/lib/services/scheduleSuggestion";
import {
  generateAndAttachImage,
  shouldGenerateImage,
  DEFAULT_WEEKLY_IMAGE_CAP,
} from "@/lib/services/postImage";
import {
  formatNextOccurrences,
  type FormattedOccurrence,
} from "@/lib/services/bestTimes";
import { strategySchema, type Strategy } from "@/lib/schemas/strategy";

const MAX_POSTS_PER_RUN = 25; // Defers to strategySchema's int(1..25) cap.

export interface GenerateWeekResult {
  ok: boolean;
  socialAccountId: string;
  skipped?:
    | "account-not-found"
    | "generation-disabled"
    | "no-strategy"
    | "already-has-upcoming-posts";
  created: number;
  withImage: number;
  scheduled: number;
  rateLimitedSuggestionIds: string[];
  failedSuggestionIds: string[];
}

interface AccountSnapshot {
  id: string;
  platform: string;
  username: string;
  autopublish: boolean;
  generationEnabled: boolean;
  strategy: Strategy | null;
  lateProfile: {
    userId: string;
    user: { timezone: string | null };
  };
}

function parseStrategy(raw: unknown): Strategy | null {
  if (!raw || typeof raw !== "object") return null;
  const parsed = strategySchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

async function loadAccount(
  socialAccountId: string
): Promise<AccountSnapshot | null> {
  const row = await prisma.socialAccount.findUnique({
    where: { id: socialAccountId },
    include: {
      lateProfile: {
        include: { user: { select: { timezone: true } } },
      },
    },
  });
  if (!row) return null;

  return {
    id: row.id,
    platform: row.platform,
    username: row.username,
    autopublish: row.autopublish,
    generationEnabled: row.generationEnabled,
    strategy: parseStrategy(row.strategy),
    lateProfile: {
      userId: row.lateProfile.userId,
      user: { timezone: row.lateProfile.user.timezone },
    },
  };
}

function buildBriefFromStrategy(args: {
  platform: string;
  strategy: Strategy;
}): string {
  const pillars = args.strategy.contentPillars
    .map((p, i) => `${i + 1}. ${p}`)
    .join("\n");
  const rules = args.strategy.voiceRules
    .map((r) => `- ${r}`)
    .join("\n");

  return [
    `Plan the next week of ${args.platform} content for this brand.`,
    "",
    "Rotate through these content pillars — try not to use the same pillar twice in a row, and aim for at least one post per pillar across the week:",
    pillars,
    "",
    "Voice rules to apply to every post:",
    rules,
    "",
    "Mix formats: news/announcements, behind-the-scenes moments, audience questions, useful tips, social proof. Lead with the most timely or relatable angle. Each post should stand on its own.",
  ].join("\n");
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function computeSchedule(args: {
  strategy: Strategy;
  count: number;
  now: Date;
  timezone: string;
}): { slots: FormattedOccurrence[] } {
  const occurrences = formatNextOccurrences(
    args.strategy.bestTimes.map((t) => ({
      day: t.day,
      hour: t.hour,
      engagement: t.score,
    })),
    args.count,
    args.now,
    args.timezone
  );
  return { slots: occurrences };
}

// "Does this account already have a post scheduled in the future?" Anchored
// to `now`, NOT to the first new slot — otherwise a chat-created draft set
// for tomorrow wouldn't block a cron-fired week piled on top of it.
async function hasUpcomingPosts(
  socialAccountId: string,
  now: Date
): Promise<boolean> {
  const existing = await prisma.postSuggestion.findFirst({
    where: {
      socialAccountId,
      scheduledAt: { gte: now },
    },
    select: { id: true },
  });
  return existing !== null;
}

/**
 * Produces one week of posts (and, where applicable, brand-styled images) for
 * a single SocialAccount and either schedules them to Zernio or leaves them
 * as drafts requiring approval. Idempotent: if the account already has a
 * scheduled post past `weekStart`, returns `already-has-upcoming-posts`.
 *
 * Rate-limited Zernio calls surface via `rateLimitedSuggestionIds` so the
 * Inngest function can drive a durable backoff + retry pass.
 */
export async function generateWeekForAccount(
  socialAccountId: string,
  now: Date = new Date()
): Promise<GenerateWeekResult> {
  console.log(
    `[weekGenerate] ▶ socialAccountId=${socialAccountId} now=${now.toISOString()}`
  );

  const base: GenerateWeekResult = {
    ok: true,
    socialAccountId,
    created: 0,
    withImage: 0,
    scheduled: 0,
    rateLimitedSuggestionIds: [],
    failedSuggestionIds: [],
  };

  const account = await loadAccount(socialAccountId);
  if (!account) return { ...base, ok: false, skipped: "account-not-found" };

  if (!account.generationEnabled) {
    return { ...base, skipped: "generation-disabled" };
  }

  if (!account.strategy) {
    console.warn(
      `[weekGenerate] skip — no strategy on socialAccount=${socialAccountId}`
    );
    return { ...base, skipped: "no-strategy" };
  }

  const count = Math.min(account.strategy.postsPerWeek, MAX_POSTS_PER_RUN);
  const timezone = account.lateProfile.user.timezone ?? "UTC";

  if (await hasUpcomingPosts(socialAccountId, now)) {
    console.log(
      `[weekGenerate] skip — socialAccount=${socialAccountId} already has posts scheduled past ${now.toISOString()}`
    );
    return { ...base, skipped: "already-has-upcoming-posts" };
  }

  const { slots } = computeSchedule({
    strategy: account.strategy,
    count,
    now,
    timezone,
  });

  if (slots.length === 0) {
    console.warn(
      `[weekGenerate] skip — strategy.bestTimes produced 0 upcoming slots for socialAccount=${socialAccountId}`
    );
    return { ...base, skipped: "no-strategy" };
  }

  // 7-day rolling window for the per-user image cap: counts what we've
  // generated in the last week, NOT what we're about to schedule for the
  // coming week. The latter would always start at 0.
  const capWindowStart = new Date(now.getTime() - SEVEN_DAYS_MS);

  const brief = buildBriefFromStrategy({
    platform: account.platform,
    strategy: account.strategy,
  });
  const scheduledAtList = slots.map((s) => new Date(s.iso));

  const { suggestions, failedAccountIds } = await createFromBrief({
    userId: account.lateProfile.userId,
    accountIds: [account.id],
    brief,
    count,
    scheduledAtList,
  });

  if (failedAccountIds.includes(account.id)) {
    console.error(
      `[weekGenerate] createFromBrief failed for socialAccount=${socialAccountId}`
    );
    return { ...base, ok: false };
  }

  base.created = suggestions.length;
  console.log(
    `[weekGenerate] ✓ created=${base.created} for socialAccount=${socialAccountId}`
  );

  // Image generation — only for image-required platforms. Cap-aware per user.
  if (shouldGenerateImage(account.platform)) {
    for (const suggestion of suggestions) {
      const result = await generateAndAttachImage({
        suggestionId: suggestion.id,
        capWindowStart,
        weeklyCap: DEFAULT_WEEKLY_IMAGE_CAP,
      });
      if (result.ok) {
        base.withImage += 1;
      } else if (result.reason === "cap_exceeded") {
        console.warn(
          `[weekGenerate] cap hit on userId=${account.lateProfile.userId} — remaining posts go out as text-only`
        );
        break;
      }
    }
  }

  // Approval mode short-circuits Zernio scheduling — the drafts wait for
  // explicit approval in the UI (Phase 6).
  if (!account.autopublish) {
    console.log(
      `[weekGenerate] approval mode — leaving ${base.created} drafts for user review`
    );
    return base;
  }

  // Autopublish: schedule each suggestion to Zernio. 429s come back as
  // `rate_limited` for the caller to retry after a durable sleep.
  for (const suggestion of suggestions) {
    const result: ScheduleSuggestionResult = await scheduleSuggestionToZernio(
      suggestion.id
    );
    if (result.ok) {
      base.scheduled += 1;
      continue;
    }
    if (result.error === "rate_limited") {
      base.rateLimitedSuggestionIds.push(suggestion.id);
      continue;
    }
    base.failedSuggestionIds.push(suggestion.id);
    console.error(
      `[weekGenerate] schedule failed suggestion=${suggestion.id} error=${result.error}${
        "message" in result ? ` message=${result.message}` : ""
      }`
    );
  }

  console.log(
    `[weekGenerate] ⌃ socialAccount=${socialAccountId} scheduled=${base.scheduled} rateLimited=${base.rateLimitedSuggestionIds.length} failed=${base.failedSuggestionIds.length}`
  );

  return base;
}
