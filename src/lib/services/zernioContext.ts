import {
  getAnalytics,
  getBestTimeToPost,
  getPostingFrequency,
  getFollowerStats,
  type AnalyticsPost,
  type BestTimeSlot,
  type PostingFrequencyRow,
} from "@/lib/late/mutations";
import { getPlatformConfig } from "@/lib/insights/platformConfig";
import type { DataQuality } from "@/lib/schemas/insights";
import { isDevelopment } from "@/utils/environments";

export interface AccountMeta {
  followersCount: number | null;
  growth30d: number | null;
  growth30dPercentage: number | null;
  displayName: string | null;
}

export interface PostingFrequencySummary {
  avgPostsPerWeek: number;
  bestPostsPerWeek: number;
  weeksObserved: number;
}

export interface ZernioContext {
  posts: AnalyticsPost[];
  accountMeta: AccountMeta;
  bestTimes: BestTimeSlot[] | null;
  postingFrequency: PostingFrequencySummary | null;
  syncTriggered: boolean;
  dataQuality: DataQuality;
}

interface GatherOptions {
  platform: string;
  lateAccountId: string;
  apiKey: string;
  source?: "external" | "all";
}

const POST_LIMIT = 20;
const RICH_THRESHOLD = 5;

function pickSortBy(primaryMetric: string): string {
  if (primaryMetric === "views") return "views";
  if (primaryMetric === "saves") return "saves";
  return "engagement";
}

async function safeGetBestTimes(
  apiKey: string,
  platform: string
): Promise<BestTimeSlot[] | null> {
  try {
    const res = await getBestTimeToPost(apiKey, { platform, source: "all" });
    if (isDevelopment) {
      console.log(
        `[zernio:raw] getBestTimeToPost(${platform}) →`,
        JSON.stringify(res, null, 2)
      );
    } else {
      console.log(`[zernio:raw] getBestTimeToPost(${platform}) → ${res.slots.length} slots`);
    }
    return res.slots;
  } catch (err) {
    console.warn(
      `[zernioContext] getBestTimeToPost failed for ${platform} (likely no add-on or no posts):`,
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

async function safeGetPostingFrequency(
  apiKey: string,
  platform: string
): Promise<PostingFrequencySummary | null> {
  try {
    const res = await getPostingFrequency(apiKey, { platform, source: "all" });
    if (isDevelopment) {
      console.log(
        `[zernio:raw] getPostingFrequency(${platform}) →`,
        JSON.stringify(res, null, 2)
      );
    } else {
      console.log(`[zernio:raw] getPostingFrequency(${platform}) → ${res.frequency.length} rows`);
    }
    return summarisePostingFrequency(res.frequency);
  } catch (err) {
    console.warn(
      `[zernioContext] getPostingFrequency failed for ${platform} (likely no add-on):`,
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

function summarisePostingFrequency(
  rows: PostingFrequencyRow[]
): PostingFrequencySummary | null {
  if (rows.length === 0) return null;

  let totalPosts = 0;
  let totalWeeks = 0;
  let bestRow = rows[0];
  for (const row of rows) {
    totalPosts += row.posts_per_week * row.weeks_count;
    totalWeeks += row.weeks_count;
    if (row.avg_engagement_rate > bestRow.avg_engagement_rate) {
      bestRow = row;
    }
  }

  return {
    avgPostsPerWeek: totalWeeks > 0 ? round2(totalPosts / totalWeeks) : 0,
    bestPostsPerWeek: bestRow.posts_per_week,
    weeksObserved: totalWeeks,
  };
}

async function safeGetFollowerStats(
  apiKey: string,
  lateAccountId: string
): Promise<{ growth30d: number | null; growth30dPercentage: number | null }> {
  try {
    const res = await getFollowerStats(apiKey, { accountIds: lateAccountId });
    if (isDevelopment) {
      console.log(
        `[zernio:raw] getFollowerStats(${lateAccountId}) →`,
        JSON.stringify(res, null, 2)
      );
    } else {
      console.log(`[zernio:raw] getFollowerStats(${lateAccountId}) → ${res.accounts.length} accounts`);
    }
    const account = res.accounts.find((a) => a._id === lateAccountId);
    if (!account) return { growth30d: null, growth30dPercentage: null };
    return {
      growth30d: account.growth ?? null,
      growth30dPercentage: account.growthPercentage ?? null,
    };
  } catch (err) {
    console.warn(
      `[zernioContext] getFollowerStats failed (likely no add-on):`,
      err instanceof Error ? err.message : err
    );
    return { growth30d: null, growth30dPercentage: null };
  }
}

export async function gatherAccountContext(
  options: GatherOptions
): Promise<ZernioContext> {
  const { platform, lateAccountId, apiKey, source = "external" } = options;
  const config = getPlatformConfig(platform);

  // Skip post fetch when:
  //  - the platform doesn't support analytics at all (Bluesky), OR
  //  - the platform has no external history AND we're asking for external only (LinkedIn personal first scan).
  // On `source: "all"` for noExternalHistory platforms, we DO fetch — posts published via PostClaw will be returned.
  const skipPostFetch =
    !config.supportsAnalytics ||
    (config.noExternalHistory && source === "external");

  console.log(
    `[zernioContext] 🔎 platform=${platform} source=${source} noExternalHistory=${config.noExternalHistory} supportsAnalytics=${config.supportsAnalytics} skipPostFetch=${skipPostFetch}`
  );

  // Always fetch a single getAnalytics call to get accountMeta (followers, displayName).
  // For skipped platforms we use limit=1 to minimise data fetched.
  const sortBy = pickSortBy(config.primaryMetric);
  const limit = skipPostFetch ? 1 : POST_LIMIT;

  const analytics = await getAnalytics(apiKey, {
    source,
    platform,
    sortBy,
    order: "desc",
    limit,
  });

  if (isDevelopment) {
    console.log(
      `[zernio:raw] getAnalytics(${platform}, source=${source}, sortBy=${sortBy}, limit=${limit}) →`,
      JSON.stringify(analytics, null, 2)
    );
  } else {
    console.log(
      `[zernio:raw] getAnalytics(${platform}, source=${source}, sortBy=${sortBy}, limit=${limit}) → ${analytics.posts?.length ?? 0} posts`
    );
  }

  console.log(
    `[zernioContext] 📦 analytics summary — posts=${analytics.posts.length}, accounts=${analytics.accounts?.length ?? 0}, syncTriggered=${analytics.overview.dataStaleness?.syncTriggered ?? false}`
  );

  const rawAccount = analytics.accounts?.find((a) => a._id === lateAccountId) ?? analytics.accounts?.[0];
  const accountMeta: AccountMeta = {
    followersCount: rawAccount?.followersCount ?? null,
    displayName: rawAccount?.displayName ?? rawAccount?.username ?? null,
    growth30d: null,
    growth30dPercentage: null,
  };

  const syncTriggered = analytics.overview.dataStaleness?.syncTriggered ?? false;

  // Early return when we deliberately skipped fetching posts.
  if (skipPostFetch) {
    return {
      posts: [],
      accountMeta,
      bestTimes: null,
      postingFrequency: null,
      syncTriggered,
      dataQuality: "platform_no_history",
    };
  }

  const posts = analytics.posts;

  // Parallel fetch follower stats + best times + posting frequency (best effort, all degrade gracefully).
  const [followerGrowth, bestTimes, postingFrequency] = await Promise.all([
    safeGetFollowerStats(apiKey, lateAccountId),
    posts.length > 0 ? safeGetBestTimes(apiKey, platform) : Promise.resolve(null),
    posts.length > 0 ? safeGetPostingFrequency(apiKey, platform) : Promise.resolve(null),
  ]);

  accountMeta.growth30d = followerGrowth.growth30d;
  accountMeta.growth30dPercentage = followerGrowth.growth30dPercentage;

  const dataQuality: DataQuality =
    posts.length === 0 ? "cold_start" : posts.length < RICH_THRESHOLD ? "thin" : "rich";

  console.log(
    `[zernioContext] 📊 dataQuality=${dataQuality}, followers=${accountMeta.followersCount ?? "n/a"}, bestTimes=${bestTimes ? bestTimes.length : "null"}, postingFrequency=${postingFrequency ? "yes" : "null"}`
  );

  return {
    posts,
    accountMeta,
    bestTimes,
    postingFrequency,
    syncTriggered,
    dataQuality,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
