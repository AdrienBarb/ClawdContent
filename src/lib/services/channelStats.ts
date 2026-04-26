import { prisma } from "@/lib/db/prisma";
import {
  getAnalytics,
  getFollowerStats,
  listPosts,
  AnalyticsResponse,
  FollowerStatsResponse,
} from "@/lib/late/mutations";
import {
  PLATFORM_CONFIG,
  getPlatformConfig,
} from "@/lib/insights/platformConfig";

const WINDOW_DAYS = 30;

// Narrowed view of PrimaryMetric — every entry in PLATFORM_CONFIG uses one of these three.
type CountablePrimary = "likes" | "views" | "saves";
type SecondaryKey = "engagementRate" | "likes" | "impressions";
type PrimaryKey = CountablePrimary | "posts";

export interface ChannelHeaderStats {
  platform: string;
  followers: {
    value: number | null;
    delta30d: number | null;
    deltaPct: number | null;
  };
  primary: {
    key: PrimaryKey;
    label: string;
    value: number | null;
  };
  secondary: {
    key: SecondaryKey;
    label: string;
    value: number | null;
    suffix?: "%";
  } | null;
  windowDays: typeof WINDOW_DAYS;
  hasAnalyticsAccess: boolean;
}

const PRIMARY_LABEL: Record<PrimaryKey, string> = {
  likes: "Likes",
  views: "Views",
  saves: "Saves",
  posts: "Posts",
};

const SECONDARY_FOR_PRIMARY: Record<
  CountablePrimary,
  { key: SecondaryKey; label: string; suffix?: "%" }
> = {
  likes: { key: "engagementRate", label: "Engagement", suffix: "%" },
  views: { key: "likes", label: "Likes" },
  saves: { key: "impressions", label: "Impressions" },
};

function narrowPrimary(metric: string): CountablePrimary {
  if (metric === "likes" || metric === "views" || metric === "saves") {
    return metric;
  }
  // PLATFORM_CONFIG only ever uses likes/views/saves today; default defensively.
  return "likes";
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function thirtyDayWindow() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - WINDOW_DAYS);
  return { fromDate: formatDate(start), toDate: formatDate(now) };
}

function safeNumber(n: number | null | undefined): number | null {
  if (n === null || n === undefined) return null;
  if (Number.isNaN(n)) return null;
  return n;
}

function sumPostMetric(
  posts: AnalyticsResponse["posts"],
  pick: (a: AnalyticsResponse["posts"][number]["analytics"]) => number
): number {
  return posts.reduce((acc, p) => acc + (pick(p.analytics) || 0), 0);
}

function avgEngagementRate(posts: AnalyticsResponse["posts"]): number | null {
  const rates = posts
    .map((p) => p.analytics.engagementRate)
    .filter(
      (v): v is number => typeof v === "number" && !Number.isNaN(v) && v >= 0
    );
  if (rates.length === 0) return null;
  const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
  return Math.round(avg * 100) / 100;
}

function impressionsTotal(posts: AnalyticsResponse["posts"]): number {
  // Some platforms report views in lieu of impressions; mirror analytics.ts behavior.
  return posts.reduce(
    (acc, p) => acc + ((p.analytics.impressions || p.analytics.views) ?? 0),
    0
  );
}

function findFollowerAccount(
  raw: FollowerStatsResponse | null,
  lateAccountId: string
): FollowerStatsResponse["accounts"][number] | undefined {
  if (!raw) return undefined;
  return raw.accounts.find((a) => a._id === lateAccountId);
}

export async function getChannelHeaderStats(
  userId: string,
  accountId: string
): Promise<ChannelHeaderStats | null> {
  const account = await prisma.socialAccount.findFirst({
    where: { id: accountId, lateProfile: { userId } },
    include: { lateProfile: true },
  });
  if (!account) return null;

  const platform = account.platform;
  if (!(platform in PLATFORM_CONFIG)) return null;
  const config = getPlatformConfig(platform);

  const apiKey = account.lateProfile.lateApiKey;
  const profileId = account.lateProfile.lateProfileId;
  const lateAccountId = account.lateAccountId;
  const { fromDate, toDate } = thirtyDayWindow();

  // Bluesky has no analytics — only fetch followers + total posts count.
  if (!config.supportsAnalytics) {
    const [followerRaw, postsList] = await Promise.all([
      getFollowerStats(apiKey, { fromDate, toDate }).catch((e) => {
        console.error(
          "[channelStats] getFollowerStats failed:",
          e instanceof Error ? e.message : e
        );
        return null;
      }),
      listPosts(profileId, apiKey, {
        status: "published",
        limit: 1,
        platform,
      }).catch((e) => {
        console.error(
          "[channelStats] listPosts failed:",
          e instanceof Error ? e.message : e
        );
        return null;
      }),
    ]);

    const acct = findFollowerAccount(followerRaw, lateAccountId);
    return {
      platform,
      followers: {
        value: safeNumber(acct?.currentFollowers),
        delta30d: null,
        deltaPct: null,
      },
      primary: {
        key: "posts",
        label: PRIMARY_LABEL.posts,
        value: postsList ? postsList.pagination.total : null,
      },
      secondary: null,
      windowDays: WINDOW_DAYS,
      hasAnalyticsAccess: false,
    };
  }

  // Standard path: fetch per-post analytics + follower stats in parallel.
  const [analyticsRaw, followerRaw] = await Promise.all([
    getAnalytics(apiKey, {
      platform,
      fromDate,
      toDate,
      source: "all",
      limit: 100,
    }).catch((e) => {
      console.error(
        "[channelStats] getAnalytics failed:",
        e instanceof Error ? e.message : e
      );
      return null;
    }),
    getFollowerStats(apiKey, { fromDate, toDate }).catch((e) => {
      console.error(
        "[channelStats] getFollowerStats failed:",
        e instanceof Error ? e.message : e
      );
      return null;
    }),
  ]);

  const hasAnalyticsAccess = analyticsRaw !== null;
  const posts = (analyticsRaw?.posts ?? []).filter(
    (p) => p.platform === platform
  );

  const primaryKey: CountablePrimary = narrowPrimary(config.primaryMetric);
  const secMeta = SECONDARY_FOR_PRIMARY[primaryKey];

  const primaryValue = !hasAnalyticsAccess
    ? null
    : primaryKey === "likes"
      ? sumPostMetric(posts, (a) => a.likes)
      : primaryKey === "views"
        ? sumPostMetric(posts, (a) => a.views)
        : sumPostMetric(posts, (a) => a.saves);

  const secondaryValue = !hasAnalyticsAccess
    ? null
    : secMeta.key === "engagementRate"
      ? avgEngagementRate(posts)
      : secMeta.key === "likes"
        ? sumPostMetric(posts, (a) => a.likes)
        : impressionsTotal(posts);

  const acct = findFollowerAccount(followerRaw, lateAccountId);

  return {
    platform,
    followers: {
      value: safeNumber(acct?.currentFollowers),
      delta30d: safeNumber(acct?.growth),
      deltaPct: safeNumber(acct?.growthPercentage),
    },
    primary: {
      key: primaryKey,
      label: PRIMARY_LABEL[primaryKey],
      value: primaryValue,
    },
    secondary: {
      key: secMeta.key,
      label: secMeta.label,
      value: secondaryValue,
      ...(secMeta.suffix ? { suffix: secMeta.suffix } : {}),
    },
    windowDays: WINDOW_DAYS,
    hasAnalyticsAccess,
  };
}
