import { prisma } from "@/lib/db/prisma";
import {
  getAnalytics,
  getFollowerStats as lateFollowerStats,
  getBestTimeToPost as lateBestTime,
  AnalyticsPost,
  FollowerStatsResponse,
  BestTimeSlot,
} from "@/lib/late/mutations";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function periodToDays(period: string): number {
  switch (period) {
    case "7d":
      return 7;
    case "90d":
      return 90;
    default:
      return 30;
  }
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function computeDateRange(period: string) {
  const days = periodToDays(period);
  const now = new Date();
  const endDate = formatDate(now);

  const start = new Date(now);
  start.setDate(start.getDate() - days);
  const startDate = formatDate(start);

  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevEndDate = formatDate(prevEnd);

  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - days + 1);
  const prevStartDate = formatDate(prevStart);

  return { startDate, endDate, prevStartDate, prevEndDate };
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

async function getUserProfile(userId: string) {
  const lateProfile = await prisma.lateProfile.findUnique({
    where: { userId },
    include: { socialAccounts: { where: { status: "active" } } },
  });
  if (!lateProfile) return null;
  return {
    apiKey: lateProfile.lateApiKey,
    connectedPlatforms: new Set(
      lateProfile.socialAccounts.map((a) => a.platform)
    ),
  };
}

// ---------------------------------------------------------------------------
// Aggregate posts into daily chart data
// ---------------------------------------------------------------------------

export interface DailyChartPoint {
  date: string;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  posts: number;
  platforms: Record<string, number>;
}

function aggregatePostsByDay(posts: AnalyticsPost[]): DailyChartPoint[] {
  const byDate = new Map<string, DailyChartPoint>();

  for (const post of posts) {
    const date = post.publishedAt?.split("T")[0];
    if (!date) continue;

    const existing = byDate.get(date) ?? {
      date,
      impressions: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      clicks: 0,
      posts: 0,
      platforms: {},
    };

    const a = post.analytics;
    existing.impressions += a.impressions;
    existing.likes += a.likes;
    existing.comments += a.comments;
    existing.shares += a.shares;
    existing.saves += a.saves;
    existing.clicks += a.clicks;
    existing.posts += 1;
    existing.platforms[post.platform] =
      (existing.platforms[post.platform] ?? 0) + 1;

    byDate.set(date, existing);
  }

  return Array.from(byDate.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
}

function sumPoints(points: DailyChartPoint[]) {
  return points.reduce(
    (acc, p) => ({
      impressions: acc.impressions + p.impressions,
      likes: acc.likes + p.likes,
      comments: acc.comments + p.comments,
      shares: acc.shares + p.shares,
      saves: acc.saves + p.saves,
      clicks: acc.clicks + p.clicks,
      posts: acc.posts + p.posts,
    }),
    {
      impressions: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      clicks: 0,
      posts: 0,
    }
  );
}

// ---------------------------------------------------------------------------
// Exported service functions
// ---------------------------------------------------------------------------

const emptyFollowers: FollowerStatsResponse = {
  accounts: [],
  stats: {},
  dateRange: { from: "", to: "" },
  granularity: "daily",
};

export interface OverviewMetrics {
  kpis: {
    impressions: { value: number; change: number | null };
    engagement: { value: number; change: number | null };
    posts: { value: number; change: number | null };
    followerGrowth: { value: number; change: number | null };
  };
  dailyMetrics: DailyChartPoint[];
  connectedPlatforms: string[];
}

const emptyOverview: OverviewMetrics = {
  kpis: {
    impressions: { value: 0, change: null },
    engagement: { value: 0, change: null },
    posts: { value: 0, change: null },
    followerGrowth: { value: 0, change: null },
  },
  dailyMetrics: [],
  connectedPlatforms: [],
};

export async function getOverviewMetrics(
  userId: string,
  period: string,
  platform?: string
): Promise<OverviewMetrics> {
  const profile = await getUserProfile(userId);
  if (!profile) return { ...emptyOverview, kpis: { ...emptyOverview.kpis }, dailyMetrics: [], connectedPlatforms: [] };
  const { apiKey, connectedPlatforms } = profile;

  const { startDate, endDate, prevStartDate, prevEndDate } =
    computeDateRange(period);

  // Fetch per-post analytics (current + previous period) and follower stats in parallel
  // Note: we use getAnalytics (per-post data) instead of getDailyMetrics because
  // the daily-metrics endpoint returns inflated/inaccurate data for some platforms (e.g. Threads).
  const [currentPostsRaw, prevPostsRaw, followerRaw] = await Promise.all([
    getAnalytics(apiKey, {
      fromDate: startDate,
      toDate: endDate,
      limit: 100,
      ...(platform && { platform }),
    }).catch((e) => {
      console.error("[Analytics] getAnalytics (current) failed:", e.message);
      return null;
    }),
    getAnalytics(apiKey, {
      fromDate: prevStartDate,
      toDate: prevEndDate,
      limit: 100,
      ...(platform && { platform }),
    }).catch((e) => {
      console.error("[Analytics] getAnalytics (prev) failed:", e.message);
      return null;
    }),
    lateFollowerStats(apiKey, {
      fromDate: startDate,
      toDate: endDate,
    }).catch((e) => {
      console.error("[Analytics] getFollowerStats failed:", e.message);
      return emptyFollowers;
    }),
  ]);

  const allowed = platform ? new Set([platform]) : connectedPlatforms;

  const currentPosts = (currentPostsRaw?.posts ?? []).filter((p) =>
    allowed.has(p.platform)
  );
  const prevPosts = (prevPostsRaw?.posts ?? []).filter((p) =>
    allowed.has(p.platform)
  );

  const currentDaily = aggregatePostsByDay(currentPosts);
  const cur = sumPoints(currentDaily);
  const prev = sumPoints(aggregatePostsByDay(prevPosts));

  const curEngagement = cur.likes + cur.comments + cur.shares + cur.saves;
  const prevEngagement = prev.likes + prev.comments + prev.shares + prev.saves;

  // Follower stats
  const accounts = Array.isArray(followerRaw?.accounts)
    ? followerRaw.accounts
    : [];
  const relevantAccounts = accounts.filter((a) => allowed.has(a.platform));
  const totalFollowers = relevantAccounts.reduce(
    (sum, a) => sum + (a.currentFollowers ?? 0),
    0
  );
  const totalGrowth = relevantAccounts.reduce(
    (sum, a) => sum + (a.growth ?? 0),
    0
  );
  // Compute weighted average growth percentage
  const followerChange =
    relevantAccounts.length > 0 && totalFollowers > 0
      ? Math.round(
          relevantAccounts.reduce(
            (sum, a) => sum + (a.growthPercentage ?? 0) * (a.currentFollowers ?? 0),
            0
          ) / totalFollowers
        )
      : null;

  return {
    kpis: {
      impressions: {
        value: cur.impressions,
        change: pctChange(cur.impressions, prev.impressions),
      },
      engagement: {
        value: curEngagement,
        change: pctChange(curEngagement, prevEngagement),
      },
      posts: {
        value: cur.posts,
        change: pctChange(cur.posts, prev.posts),
      },
      followerGrowth: {
        value: totalFollowers,
        change: followerChange,
      },
    },
    dailyMetrics: currentDaily,
    connectedPlatforms: [...connectedPlatforms],
  };
}

export async function getTopPosts(
  userId: string,
  options?: {
    limit?: number;
    fromDate?: string;
    toDate?: string;
    platform?: string;
  }
): Promise<AnalyticsPost[]> {
  const profile = await getUserProfile(userId);
  if (!profile) return [];

  try {
    const result = await getAnalytics(profile.apiKey, {
      fromDate: options?.fromDate,
      toDate: options?.toDate,
      limit: 100,
      ...(options?.platform && { platform: options.platform }),
    });

    const posts = Array.isArray(result?.posts) ? result.posts : [];
    const desiredLimit = options?.limit ?? 10;
    const allowed = options?.platform
      ? new Set([options.platform])
      : profile.connectedPlatforms;

    return posts
      .filter((p) => allowed.has(p.platform))
      .sort((a, b) => {
        const engA =
          a.analytics.likes +
          a.analytics.comments +
          a.analytics.shares +
          a.analytics.saves;
        const engB =
          b.analytics.likes +
          b.analytics.comments +
          b.analytics.shares +
          b.analytics.saves;
        return engB - engA;
      })
      .slice(0, desiredLimit);
  } catch {
    return [];
  }
}

export async function getBestPostingTimes(
  userId: string,
  platform?: string
): Promise<BestTimeSlot[]> {
  const profile = await getUserProfile(userId);
  if (!profile) return [];

  try {
    const result = await lateBestTime(profile.apiKey, {
      platform: platform || undefined,
    });
    return Array.isArray(result?.slots) ? result.slots : [];
  } catch {
    return [];
  }
}

export async function getFollowerGrowth(
  userId: string,
  platform?: string
): Promise<FollowerStatsResponse> {
  const profile = await getUserProfile(userId);
  if (!profile) return { ...emptyFollowers, accounts: [], stats: {} };

  try {
    const result = await lateFollowerStats(profile.apiKey);

    if (!platform) return result;

    const filteredAccounts = (result.accounts ?? []).filter(
      (a) => a.platform === platform
    );
    const filteredAccountIds = new Set(filteredAccounts.map((a) => a._id));
    const filteredStats: Record<string, { date: string; followers: number }[]> =
      {};
    for (const [id, points] of Object.entries(result.stats ?? {})) {
      if (filteredAccountIds.has(id)) filteredStats[id] = points;
    }

    return { ...result, accounts: filteredAccounts, stats: filteredStats };
  } catch {
    return emptyFollowers;
  }
}
