import { prisma } from "@/lib/db/prisma";
import {
  getAnalytics,
  getDailyMetrics as lateDailyMetrics,
  getFollowerStats as lateFollowerStats,
  getBestTimeToPost as lateBestTime,
  PostAnalytics,
  DailyMetric,
  FollowerStat,
  BestTime,
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

function computeDateRange(period: string): {
  startDate: string;
  endDate: string;
  prevStartDate: string;
  prevEndDate: string;
} {
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

function sumMetrics(metrics: DailyMetric[]) {
  return metrics.reduce(
    (acc, m) => ({
      impressions: acc.impressions + m.totalImpressions,
      reach: acc.reach + m.totalReach,
      likes: acc.likes + m.totalLikes,
      comments: acc.comments + m.totalComments,
      shares: acc.shares + m.totalShares,
      saves: acc.saves + m.totalSaves,
      clicks: acc.clicks + m.totalClicks,
      views: acc.views + m.totalViews,
      posts: acc.posts + m.postCount,
    }),
    {
      impressions: 0,
      reach: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      clicks: 0,
      views: 0,
      posts: 0,
    }
  );
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

// ---------------------------------------------------------------------------
// Exported service functions
// ---------------------------------------------------------------------------

async function getApiKey(userId: string): Promise<string | null> {
  const lateProfile = await prisma.lateProfile.findUnique({
    where: { userId },
  });
  return lateProfile?.lateApiKey ?? null;
}

export interface OverviewMetrics {
  kpis: {
    impressions: { value: number; change: number | null };
    engagement: { value: number; change: number | null };
    posts: { value: number; change: number | null };
    followerGrowth: { value: number; change: number | null };
  };
  dailyMetrics: DailyMetric[];
}

export async function getOverviewMetrics(
  userId: string,
  period: string
): Promise<OverviewMetrics> {
  const apiKey = await getApiKey(userId);
  if (!apiKey) {
    return {
      kpis: {
        impressions: { value: 0, change: null },
        engagement: { value: 0, change: null },
        posts: { value: 0, change: null },
        followerGrowth: { value: 0, change: null },
      },
      dailyMetrics: [],
    };
  }

  const { startDate, endDate, prevStartDate, prevEndDate } =
    computeDateRange(period);

  const emptyMetrics = { dailyMetrics: [] };
  const emptyFollowers = { followerStats: [] };

  const [currentRaw, previousRaw, followerRaw] = await Promise.all([
    lateDailyMetrics(apiKey, { startDate, endDate }).catch((e) => {
      console.error("[Analytics] getDailyMetrics (current) failed:", e.message);
      return emptyMetrics;
    }),
    lateDailyMetrics(apiKey, { startDate: prevStartDate, endDate: prevEndDate }).catch((e) => {
      console.error("[Analytics] getDailyMetrics (previous) failed:", e.message);
      return emptyMetrics;
    }),
    lateFollowerStats(apiKey).catch((e) => {
      console.error("[Analytics] getFollowerStats failed:", e.message);
      return emptyFollowers;
    }),
  ]);

  const currentMetrics = Array.isArray(currentRaw?.dailyMetrics) ? currentRaw.dailyMetrics : [];
  const previousMetrics = Array.isArray(previousRaw?.dailyMetrics) ? previousRaw.dailyMetrics : [];
  const followerStats = Array.isArray(followerRaw?.followerStats) ? followerRaw.followerStats : [];

  const cur = sumMetrics(currentMetrics);
  const prev = sumMetrics(previousMetrics);

  const curEngagement = cur.likes + cur.comments + cur.shares + cur.saves;
  const prevEngagement = prev.likes + prev.comments + prev.shares + prev.saves;

  // Follower growth: sum net change across all accounts for the period
  const days = periodToDays(period);
  let followerGrowth = 0;
  for (const stat of followerStats) {
    const sorted = [...stat.followers].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    if (sorted.length >= 2) {
      const recent = sorted[sorted.length - 1].count;
      const daysAgo =
        sorted.find(
          (f) =>
            new Date(f.date).getTime() >=
            Date.now() - days * 24 * 60 * 60 * 1000
        )?.count ?? sorted[0].count;
      followerGrowth += recent - daysAgo;
    }
  }

  // Previous period follower growth approximation
  let prevFollowerGrowth = 0;
  for (const stat of followerStats) {
    const sorted = [...stat.followers].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    if (sorted.length >= 3) {
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      const prevCutoff = cutoff - days * 24 * 60 * 60 * 1000;
      const atCutoff =
        sorted.find((f) => new Date(f.date).getTime() >= cutoff)?.count ??
        sorted[0].count;
      const atPrevCutoff =
        sorted.find((f) => new Date(f.date).getTime() >= prevCutoff)?.count ??
        sorted[0].count;
      prevFollowerGrowth += atCutoff - atPrevCutoff;
    }
  }

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
        value: followerGrowth,
        change: pctChange(followerGrowth, prevFollowerGrowth),
      },
    },
    dailyMetrics: currentMetrics,
  };
}

export async function getTopPosts(
  userId: string,
  options?: { limit?: number; fromDate?: string; toDate?: string }
): Promise<PostAnalytics[]> {
  const apiKey = await getApiKey(userId);
  if (!apiKey) return [];

  try {
    const result = await getAnalytics(apiKey, {
      fromDate: options?.fromDate,
      toDate: options?.toDate,
      limit: options?.limit ?? 10,
    });

    return [...result.data].sort(
      (a, b) =>
        b.likes +
        b.comments +
        b.shares +
        b.saves -
        (a.likes + a.comments + a.shares + a.saves)
    );
  } catch {
    return [];
  }
}

export async function getBestPostingTimes(
  userId: string,
  platform?: string
): Promise<BestTime[]> {
  const apiKey = await getApiKey(userId);
  if (!apiKey) return [];

  try {
    const result = await lateBestTime(apiKey, { platform });
    return result.bestTimes;
  } catch {
    return [];
  }
}

export async function getFollowerGrowth(
  userId: string,
  platform?: string
): Promise<FollowerStat[]> {
  const apiKey = await getApiKey(userId);
  if (!apiKey) return [];

  try {
    const result = await lateFollowerStats(apiKey, { platform });
    return result.followerStats;
  } catch {
    return [];
  }
}
