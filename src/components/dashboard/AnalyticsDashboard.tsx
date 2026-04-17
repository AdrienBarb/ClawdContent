"use client";

import { useState, useMemo } from "react";
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

interface DailyChartPoint {
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

interface OverviewData {
  kpis: {
    impressions: KpiValue;
    engagement: KpiValue;
    posts: KpiValue;
    followerGrowth: KpiValue;
  };
  dailyMetrics: DailyChartPoint[];
  connectedPlatforms: string[];
}

interface AnalyticsPost {
  _id: string;
  content: string;
  publishedAt: string | null;
  analytics: {
    impressions: number;
    reach: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    clicks: number;
    views: number;
    engagementRate: number;
  };
  platform: string;
  platformPostUrl: string | null;
  isExternal: boolean;
}

interface BestTimeSlot {
  day_of_week: number;
  hour: number;
  avg_engagement: number;
  post_count: number;
}

interface FollowerAccount {
  _id: string;
  platform: string;
  username: string;
  currentFollowers: number;
  growth: number;
  growthPercentage: number;
}

interface FollowersData {
  accounts: FollowerAccount[];
  stats: Record<string, { date: string; followers: number }[]>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PERIODS: { value: Period; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
];

const DAYS_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon-Sun
const DAY_LABELS: Record<number, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
};

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
    label: "Followers",
    icon: UsersThreeIcon,
    format: (n: number) => (n === 0 ? "—" : formatNumber(n)),
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
  if (max === 0 || value === 0) return "bg-gray-100";
  const ratio = value / max;
  if (ratio > 0.75) return "bg-[var(--sidebar-accent)] opacity-90";
  if (ratio > 0.5) return "bg-[var(--sidebar-accent)] opacity-60";
  if (ratio > 0.25) return "bg-[var(--sidebar-accent)] opacity-35";
  return "bg-[var(--sidebar-accent)] opacity-15";
}

function buildPlatformBreakdown(
  dailyMetrics: DailyChartPoint[]
): { platform: string; posts: number; color: string }[] {
  const totals: Record<string, number> = {};
  for (const day of dailyMetrics) {
    for (const [platform, count] of Object.entries(day.platforms ?? {})) {
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

function PillSelector<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { value: T; label: string; icon?: React.ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5 rounded-xl bg-gray-100 p-1" role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all cursor-pointer ${
            value === o.value
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

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

function TopPostCard({ post }: { post: AnalyticsPost }) {
  const platform = getPlatform(post.platform);
  const a = post.analytics;
  const totalEngagement = a.likes + a.comments + a.shares + a.saves;

  return (
    <div className="flex items-start gap-4 py-3 border-b border-gray-50 last:border-0">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white mt-0.5"
        style={{ backgroundColor: platform?.color ?? "#6b7280" }}
      >
        {platform?.icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 line-clamp-2">
          {post.content?.slice(0, 120) || "Untitled post"}
        </p>
        <div className="flex items-center gap-3 mt-1.5">
          <span className="text-xs text-gray-400">
            {formatNumber(a.impressions)} views
          </span>
          <span className="text-xs text-gray-400">
            {formatNumber(totalEngagement)} engagements
          </span>
          <span className="text-xs text-gray-400">
            {formatNumber(a.clicks)} clicks
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

function BestTimeHeatmap({ slots }: { slots: BestTimeSlot[] }) {
  const grid: Record<number, Record<number, number>> = {};
  let maxEngagement = 0;

  for (const s of slots) {
    if (!grid[s.day_of_week]) grid[s.day_of_week] = {};
    grid[s.day_of_week][s.hour] = s.avg_engagement;
    if (s.avg_engagement > maxEngagement) maxEngagement = s.avg_engagement;
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        <div className="flex gap-px mb-1">
          <div className="w-16 shrink-0" />
          {HOURS.filter((h) => h % 3 === 0).map((h) => (
            <div
              key={h}
              className="flex-1 text-[10px] text-gray-400 text-center"
            >
              {h === 0
                ? "12a"
                : h < 12
                  ? `${h}a`
                  : h === 12
                    ? "12p"
                    : `${h - 12}p`}
            </div>
          ))}
        </div>
        {DAYS_ORDER.map((day) => (
          <div key={day} className="flex gap-px mb-px">
            <div className="w-16 shrink-0 text-[11px] text-gray-500 font-medium flex items-center">
              {DAY_LABELS[day]}
            </div>
            <div className="flex-1 flex gap-px">
              {HOURS.map((hour) => {
                const val = grid[day]?.[hour] ?? 0;
                return (
                  <div
                    key={hour}
                    role="gridcell"
                    aria-label={`${DAY_LABELS[day]} ${hour}:00 — ${Math.round(val)} avg engagement`}
                    className={`flex-1 h-6 rounded-sm ${getHeatmapColor(val, maxEngagement)}`}
                    title={`${DAY_LABELS[day]} ${hour}:00 — ${Math.round(val)} avg engagement`}
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </div>
  );
}

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
          Connect your social accounts and start publishing to see your
          performance metrics here.
        </p>
        <Link
          href={appRouter.dashboard}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--sidebar-accent)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90"
        >
          Go to chat
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
  const [platform, setPlatform] = useState<string>("all");

  const platformParam = platform === "all" ? undefined : platform;
  const queryParams: Record<string, string> = { period };
  if (platformParam) queryParams.platform = platformParam;

  const { data: overviewData, isLoading: overviewLoading } = useGet(
    appRouter.api.analytics,
    queryParams
  ) as { data: OverviewData | undefined; isLoading: boolean };

  const postsParams: Record<string, string> = {};
  if (platformParam) postsParams.platform = platformParam;

  const { data: postsData, isLoading: postsLoading } = useGet(
    appRouter.api.analyticsPosts,
    postsParams
  ) as { data: { posts: AnalyticsPost[] } | undefined; isLoading: boolean };

  const { data: bestTimesData, isLoading: bestTimesLoading } = useGet(
    appRouter.api.analyticsBestTimes,
    platformParam ? { platform: platformParam } : undefined
  ) as { data: { slots: BestTimeSlot[] } | undefined; isLoading: boolean };

  const { data: followersData, isLoading: followersLoading } = useGet(
    appRouter.api.analyticsFollowers,
    platformParam ? { platform: platformParam } : undefined
  ) as { data: FollowersData | undefined; isLoading: boolean };

  // All hooks must be called before any early return
  const impressionsChartData = useMemo(
    () =>
      (overviewData?.dailyMetrics ?? []).map((m) => ({
        date: formatChartDate(m.date),
        impressions: m.impressions,
      })),
    [overviewData]
  );

  const engagementChartData = useMemo(
    () =>
      (overviewData?.dailyMetrics ?? []).map((m) => ({
        date: formatChartDate(m.date),
        likes: m.likes,
        comments: m.comments,
        shares: m.shares,
      })),
    [overviewData]
  );

  const platformBreakdown = useMemo(
    () => buildPlatformBreakdown(overviewData?.dailyMetrics ?? []),
    [overviewData]
  );

  const followerChartData = useMemo(
    () => buildFollowerChartData(followersData),
    [followersData]
  );

  const followerPlatforms = useMemo(() => {
    const accountMap = new Map(
      (followersData?.accounts ?? []).map((a) => [a._id, a])
    );
    return Object.keys(followersData?.stats ?? {}).map((accountId) => {
      const account = accountMap.get(accountId);
      return {
        accountId,
        platform: account?.platform ?? "unknown",
        username: account?.username ?? accountId,
      };
    });
  }, [followersData]);

  const connectedPlatforms = overviewData?.connectedPlatforms ?? [];
  const platformOptions = useMemo(
    () => [
      { value: "all" as const, label: "All Platforms" },
      ...connectedPlatforms.map((p) => {
        const info = getPlatform(p);
        return {
          value: p,
          label: info?.label ?? p,
          icon: info?.icon ? (
            <span
              className="flex h-4 w-4 items-center justify-center rounded text-white text-[10px]"
              style={{ backgroundColor: info.color }}
            >
              {info.icon}
            </span>
          ) : undefined,
        };
      }),
    ],
    [connectedPlatforms]
  );

  if (overviewLoading) return <LoadingSkeleton />;

  const hasData =
    overviewData &&
    (overviewData.kpis.impressions.value > 0 ||
      overviewData.kpis.posts.value > 0 ||
      overviewData.dailyMetrics.length > 0);

  if (!hasData && platform === "all") return <EmptyState />;

  return (
    <div className="space-y-6">
      {/* Header + filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            Analytics
          </h1>
          <PillSelector options={PERIODS} value={period} onChange={setPeriod} ariaLabel="Time period" />
        </div>
        {connectedPlatforms.length > 1 && (
          <PillSelector
            options={platformOptions}
            value={platform}
            onChange={setPlatform}
            ariaLabel="Platform filter"
          />
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI_CONFIG.map((kpi) => (
          <KpiCard
            key={kpi.key}
            label={kpi.label}
            value={overviewData?.kpis[kpi.key].value ?? 0}
            change={overviewData?.kpis[kpi.key].change ?? null}
            icon={kpi.icon}
            format={kpi.format}
          />
        ))}
      </div>

      {/* Charts — separate impressions and engagement */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Impressions chart */}
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            Impressions
          </h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={impressionsChartData}>
                <defs>
                  <linearGradient id="impGrad" x1="0" y1="0" x2="0" y2="1">
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
                  fill="url(#impGrad)"
                  strokeWidth={2}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Engagement chart — stacked bar for likes, comments, shares */}
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            Engagement
          </h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={engagementChartData}>
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
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e5e7eb",
                    fontSize: "12px",
                  }}
                />
                <Bar
                  dataKey="likes"
                  stackId="eng"
                  fill="#e8614d"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="comments"
                  stackId="eng"
                  fill="#6366f1"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="shares"
                  stackId="eng"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Performing Posts — always visible */}
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
              <TopPostCard key={post._id} post={post} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-8">
            No post analytics yet
          </p>
        )}
      </div>

      {/* Platform-specific sections — only when a specific platform is selected */}
      {platform !== "all" && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Best Time to Post */}
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">
                Best Time to Post
              </h2>
              {bestTimesLoading ? (
                <Skeleton className="h-48 rounded-xl" />
              ) : (bestTimesData?.slots ?? []).length > 0 ? (
                <BestTimeHeatmap slots={bestTimesData!.slots} />
              ) : (
                <p className="text-sm text-gray-400 text-center py-8">
                  Not enough data to determine best times
                </p>
              )}
            </div>

            {/* Followers */}
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">
                Followers
              </h2>
              {followersLoading ? (
                <Skeleton className="h-48 rounded-xl" />
              ) : followerChartData.length > 1 ? (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={followerChartData}>
                      <defs>
                        {followerPlatforms.map((fp) => {
                          const pl = getPlatform(fp.platform);
                          return (
                            <linearGradient
                              key={fp.accountId}
                              id={`followerGrad-${fp.accountId}`}
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor={pl?.color ?? "#6b7280"}
                                stopOpacity={0.15}
                              />
                              <stop
                                offset="95%"
                                stopColor={pl?.color ?? "#6b7280"}
                                stopOpacity={0}
                              />
                            </linearGradient>
                          );
                        })}
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
                      {followerPlatforms.map((fp) => {
                        const pl = getPlatform(fp.platform);
                        return (
                          <Area
                            key={fp.accountId}
                            type="monotone"
                            dataKey={fp.accountId}
                            stroke={pl?.color ?? "#6b7280"}
                            fill={`url(#followerGrad-${fp.accountId})`}
                            strokeWidth={2}
                            dot={false}
                            name={`${pl?.label ?? fp.platform} (${fp.username})`}
                          />
                        );
                      })}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (followersData?.accounts ?? []).length > 0 ? (
                <div className="space-y-3 py-2">
                  {followersData!.accounts.map((a) => {
                    const pl = getPlatform(a.platform);
                    return (
                      <div
                        key={a._id}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="flex h-6 w-6 items-center justify-center rounded text-white text-[10px]"
                            style={{
                              backgroundColor: pl?.color ?? "#6b7280",
                            }}
                          >
                            {pl?.icon}
                          </span>
                          <span className="text-sm text-gray-700">
                            {a.username}
                          </span>
                        </div>
                        <span className="text-lg font-semibold text-gray-900">
                          {formatNumber(a.currentFollowers)}
                        </span>
                      </div>
                    );
                  })}
                  <p className="text-xs text-gray-400 pt-2">
                    Follower history chart will appear after a few days of data.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-8">
                  No follower data yet
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Follower chart data builder
// ---------------------------------------------------------------------------

function buildFollowerChartData(
  data: FollowersData | undefined
): Record<string, string | number>[] {
  if (!data?.stats) return [];

  const dateMap = new Map<string, Record<string, number>>();

  for (const [accountId, points] of Object.entries(data.stats)) {
    if (!Array.isArray(points)) continue;
    for (const p of points) {
      const existing = dateMap.get(p.date) ?? {};
      existing[accountId] = p.followers;
      dateMap.set(p.date, existing);
    }
  }

  return Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, accounts]) => ({
      date: formatChartDate(date),
      ...accounts,
    }));
}
