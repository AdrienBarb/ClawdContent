"use client";

import { useState } from "react";
import Link from "next/link";
import { appRouter } from "@/lib/constants/appRouter";
import { getPlatform } from "@/lib/constants/platforms";
import useApi from "@/lib/hooks/useApi";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendUp as TrendUpIcon,
  TrendDown as TrendDownIcon,
  Eye as EyeIcon,
  Heart as HeartIcon,
  FileText as FileTextIcon,
  UsersThree as UsersThreeIcon,
  ChartLineUp as ChartLineUpIcon,
} from "@phosphor-icons/react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
} from "recharts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Period = "7d" | "30d" | "90d";

interface KpiValue {
  value: number;
  change: number | null;
}

interface OverviewData {
  kpis: {
    impressions: KpiValue;
    engagement: KpiValue;
    posts: KpiValue;
    followerGrowth: KpiValue;
  };
  dailyMetrics: {
    date: string;
    postCount: number;
    platformDistribution: Record<string, number>;
    totalImpressions: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    totalSaves: number;
  }[];
}

interface PostAnalytics {
  postId: string;
  platform: string;
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  views: number;
}

interface BestTime {
  dayOfWeek: string;
  hour: number;
  averageEngagement: number;
}

interface FollowerStat {
  accountId: string;
  platform: string;
  followers: { date: string; count: number }[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PERIODS: { value: Period; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
];

const DAYS_ORDER = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);

const KPI_CONFIG = [
  {
    key: "impressions" as const,
    label: "Impressions",
    icon: EyeIcon,
    format: formatNumber,
  },
  {
    key: "engagement" as const,
    label: "Engagement",
    icon: HeartIcon,
    format: formatNumber,
  },
  {
    key: "posts" as const,
    label: "Posts Published",
    icon: FileTextIcon,
    format: (n: number) => String(n),
  },
  {
    key: "followerGrowth" as const,
    label: "Follower Growth",
    icon: UsersThreeIcon,
    format: formatSignedNumber,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatSignedNumber(n: number): string {
  const formatted = formatNumber(Math.abs(n));
  if (n > 0) return `+${formatted}`;
  if (n < 0) return `-${formatted}`;
  return "0";
}

function formatChartDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getHeatmapColor(value: number, max: number): string {
  if (max === 0 || value === 0) return "bg-gray-50";
  const ratio = value / max;
  if (ratio > 0.75) return "bg-[var(--sidebar-accent)] opacity-90";
  if (ratio > 0.5) return "bg-[var(--sidebar-accent)] opacity-60";
  if (ratio > 0.25) return "bg-[var(--sidebar-accent)] opacity-35";
  return "bg-[var(--sidebar-accent)] opacity-15";
}

function buildPlatformBreakdown(
  dailyMetrics: OverviewData["dailyMetrics"]
): { platform: string; posts: number; color: string }[] {
  const totals: Record<string, number> = {};
  for (const day of dailyMetrics) {
    for (const [platform, count] of Object.entries(
      day.platformDistribution ?? {}
    )) {
      totals[platform] = (totals[platform] ?? 0) + count;
    }
  }
  return Object.entries(totals)
    .map(([platform, posts]) => ({
      platform: getPlatform(platform)?.label ?? platform,
      posts,
      color: getPlatform(platform)?.color ?? "#6b7280",
    }))
    .sort((a, b) => b.posts - a.posts);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function KpiCard({
  label,
  value,
  change,
  icon: Icon,
  format,
}: {
  label: string;
  value: number;
  change: number | null;
  icon: typeof EyeIcon;
  format: (n: number) => string;
}) {
  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          {label}
        </span>
        <Icon className="h-5 w-5 text-gray-300" weight="duotone" />
      </div>
      <p className="text-2xl font-bold text-gray-900 tracking-tight">
        {format(value)}
      </p>
      {change !== null && (
        <div className="flex items-center gap-1 mt-1.5">
          {change >= 0 ? (
            <TrendUpIcon className="h-4 w-4 text-emerald-500" weight="bold" />
          ) : (
            <TrendDownIcon className="h-4 w-4 text-red-500" weight="bold" />
          )}
          <span
            className={`text-xs font-semibold ${change >= 0 ? "text-emerald-600" : "text-red-600"}`}
          >
            {change > 0 ? "+" : ""}
            {change}%
          </span>
          <span className="text-xs text-gray-400">vs prev period</span>
        </div>
      )}
    </div>
  );
}

function TopPostCard({ post }: { post: PostAnalytics }) {
  const platform = getPlatform(post.platform);
  const totalEngagement =
    post.likes + post.comments + post.shares + post.saves;

  return (
    <div className="flex items-start gap-4 py-3 border-b border-gray-50 last:border-0">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white mt-0.5"
        style={{ backgroundColor: platform?.color ?? "#6b7280" }}
      >
        {platform?.icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 line-clamp-2">{post.postId}</p>
        <div className="flex items-center gap-3 mt-1.5">
          <span className="text-xs text-gray-400">
            {formatNumber(post.impressions)} views
          </span>
          <span className="text-xs text-gray-400">
            {formatNumber(totalEngagement)} engagements
          </span>
          <span className="text-xs text-gray-400">
            {formatNumber(post.clicks)} clicks
          </span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold text-gray-900">
          {formatNumber(totalEngagement)}
        </p>
        <p className="text-xs text-gray-400">engagement</p>
      </div>
    </div>
  );
}

function BestTimeHeatmap({ bestTimes }: { bestTimes: BestTime[] }) {
  const grid: Record<string, Record<number, number>> = {};
  let maxEngagement = 0;

  for (const bt of bestTimes) {
    if (!grid[bt.dayOfWeek]) grid[bt.dayOfWeek] = {};
    grid[bt.dayOfWeek][bt.hour] = bt.averageEngagement;
    if (bt.averageEngagement > maxEngagement)
      maxEngagement = bt.averageEngagement;
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        {/* Header row */}
        <div className="flex gap-px mb-1">
          <div className="w-16 shrink-0" />
          {HOURS.filter((h) => h % 3 === 0).map((h) => (
            <div
              key={h}
              className="flex-1 text-[10px] text-gray-400 text-center"
            >
              {h === 0 ? "12a" : h < 12 ? `${h}a` : h === 12 ? "12p" : `${h - 12}p`}
            </div>
          ))}
        </div>

        {/* Day rows */}
        {DAYS_ORDER.map((day) => (
          <div key={day} className="flex gap-px mb-px">
            <div className="w-16 shrink-0 text-[11px] text-gray-500 font-medium flex items-center">
              {day.slice(0, 3)}
            </div>
            <div className="flex-1 flex gap-px">
              {HOURS.map((hour) => {
                const val = grid[day]?.[hour] ?? 0;
                return (
                  <div
                    key={hour}
                    className={`flex-1 h-6 rounded-sm ${getHeatmapColor(val, maxEngagement)}`}
                    title={`${day} ${hour}:00 — ${Math.round(val)} avg engagement`}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-64 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="h-72 rounded-2xl lg:col-span-2" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
        Analytics
      </h1>
      <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white/50 p-12 text-center">
        <ChartLineUpIcon className="h-10 w-10 text-gray-300 mx-auto mb-4" />
        <p className="text-sm font-medium text-gray-500 mb-1">
          No analytics data yet
        </p>
        <p className="text-xs text-gray-400 mb-5">
          Start publishing posts to see your performance metrics here.
        </p>
        <Link
          href={appRouter.dashboard}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--sidebar-accent)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90"
        >
          Create your first post
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function AnalyticsDashboard() {
  const { useGet } = useApi();
  const [period, setPeriod] = useState<Period>("30d");

  // Fetch all data
  const { data: overviewData, isLoading: overviewLoading } =
    useGet(appRouter.api.analytics, { period }) as {
      data: OverviewData | undefined;
      isLoading: boolean;
    };

  const { data: postsData, isLoading: postsLoading } = useGet(
    appRouter.api.analyticsPosts
  ) as { data: { posts: PostAnalytics[] } | undefined; isLoading: boolean };

  const { data: bestTimesData, isLoading: bestTimesLoading } = useGet(
    appRouter.api.analyticsBestTimes
  ) as { data: { bestTimes: BestTime[] } | undefined; isLoading: boolean };

  const { data: followersData, isLoading: followersLoading } = useGet(
    appRouter.api.analyticsFollowers
  ) as {
    data: { followerStats: FollowerStat[] } | undefined;
    isLoading: boolean;
  };

  // Loading state
  if (overviewLoading) return <LoadingSkeleton />;

  // Empty state
  const hasData =
    overviewData &&
    (overviewData.kpis.impressions.value > 0 ||
      overviewData.kpis.posts.value > 0 ||
      overviewData.dailyMetrics.length > 0);

  if (!hasData) return <EmptyState />;

  // Chart data
  const chartData = (overviewData?.dailyMetrics ?? []).map((m) => ({
    date: formatChartDate(m.date),
    impressions: m.totalImpressions,
    engagement:
      m.totalLikes + m.totalComments + m.totalShares + m.totalSaves,
  }));

  const platformBreakdown = buildPlatformBreakdown(
    overviewData?.dailyMetrics ?? []
  );

  // Follower chart data
  const followerChartData = buildFollowerChartData(
    followersData?.followerStats ?? []
  );

  return (
    <div className="space-y-6">
      {/* Header + period selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Analytics
        </h1>
        <div className="flex gap-1.5 rounded-xl bg-gray-100 p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all cursor-pointer ${
                period === p.value
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI_CONFIG.map((kpi) => (
          <KpiCard
            key={kpi.key}
            label={kpi.label}
            value={overviewData!.kpis[kpi.key].value}
            change={overviewData!.kpis[kpi.key].change}
            icon={kpi.icon}
            format={kpi.format}
          />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Daily engagement chart */}
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            Daily Performance
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient
                    id="impressionsGrad"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="var(--sidebar-accent)"
                      stopOpacity={0.15}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--sidebar-accent)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                  <linearGradient
                    id="engagementGrad"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={formatNumber}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e5e7eb",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="impressions"
                  stroke="#e8614d"
                  fill="url(#impressionsGrad)"
                  strokeWidth={2}
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="engagement"
                  stroke="#6366f1"
                  fill="url(#engagementGrad)"
                  strokeWidth={2}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Platform breakdown */}
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            Posts by Platform
          </h2>
          {platformBreakdown.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={platformBreakdown}
                  layout="vertical"
                  margin={{ left: 0 }}
                >
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="platform"
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    axisLine={false}
                    tickLine={false}
                    width={80}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid #e5e7eb",
                      fontSize: "12px",
                    }}
                  />
                  <Bar
                    dataKey="posts"
                    radius={[0, 6, 6, 0]}
                    fill="#e8614d"
                    barSize={20}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">
              No platform data yet
            </p>
          )}
        </div>
      </div>

      {/* Intelligence Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Posts */}
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            Top Performing Posts
          </h2>
          {postsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-xl" />
              ))}
            </div>
          ) : (postsData?.posts ?? []).length > 0 ? (
            <div>
              {postsData!.posts.slice(0, 5).map((post) => (
                <TopPostCard key={post.postId} post={post} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">
              No post analytics yet
            </p>
          )}
        </div>

        {/* Best Time to Post */}
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            Best Time to Post
          </h2>
          {bestTimesLoading ? (
            <Skeleton className="h-48 rounded-xl" />
          ) : (bestTimesData?.bestTimes ?? []).length > 0 ? (
            <BestTimeHeatmap bestTimes={bestTimesData!.bestTimes} />
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">
              Not enough data to determine best times
            </p>
          )}
        </div>
      </div>

      {/* Follower Growth */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">
          Follower Growth
        </h2>
        {followersLoading ? (
          <Skeleton className="h-64 rounded-xl" />
        ) : followerChartData.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={followerChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={formatNumber}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e5e7eb",
                    fontSize: "12px",
                  }}
                />
                {(followersData?.followerStats ?? []).map((stat) => {
                  const platform = getPlatform(stat.platform);
                  return (
                    <Line
                      key={stat.accountId}
                      type="monotone"
                      dataKey={stat.platform}
                      stroke={platform?.color ?? "#6b7280"}
                      strokeWidth={2}
                      dot={false}
                      name={platform?.label ?? stat.platform}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-8">
            No follower data yet
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Follower chart data builder
// ---------------------------------------------------------------------------

function buildFollowerChartData(
  stats: FollowerStat[]
): Record<string, string | number>[] {
  if (stats.length === 0) return [];

  // Collect all dates and build a map: date -> { platform: count }
  const dateMap = new Map<string, Record<string, number>>();

  for (const stat of stats) {
    for (const f of stat.followers) {
      const existing = dateMap.get(f.date) ?? {};
      existing[stat.platform] = f.count;
      dateMap.set(f.date, existing);
    }
  }

  return Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, platforms]) => ({
      date: formatChartDate(date),
      ...platforms,
    }));
}
