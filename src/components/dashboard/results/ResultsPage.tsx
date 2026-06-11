"use client";

import Image from "next/image";
import { ImageIcon, SpinnerGapIcon } from "@phosphor-icons/react";
import PageHeader from "@/components/dashboard/PageHeader";
import { appRouter } from "@/lib/constants/appRouter";
import { getPlatform } from "@/lib/constants/platforms";
import useApi from "@/lib/hooks/useApi";

// ---------------------------------------------------------------------------
// Types (shapes returned by /api/analytics + /api/analytics/posts)
// ---------------------------------------------------------------------------

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
  connectedPlatforms: string[];
}

interface ResultPost {
  _id: string;
  content: string;
  publishedAt: string | null;
  platform: string;
  thumbnailUrl?: string | null;
  analytics: {
    impressions: number;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

// Computed once per page load — keeps the query key stable across renders.
const FROM_DATE = daysAgo(30);

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-gray-900 tabular-nums">
        {value}
      </p>
    </div>
  );
}

function TopPostRow({ post }: { post: ResultPost }) {
  const platform = getPlatform(post.platform);
  const a = post.analytics;
  const engagement = a.likes + a.comments + a.shares + a.saves;

  return (
    <div className="flex min-w-0 items-center gap-3 border-b border-gray-100 py-3 last:border-0">
      {post.thumbnailUrl ? (
        <Image
          src={post.thumbnailUrl}
          alt=""
          width={48}
          height={48}
          unoptimized
          className="h-12 w-12 shrink-0 rounded-lg bg-gray-100 object-cover"
        />
      ) : (
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gray-100">
          <ImageIcon className="h-5 w-5 text-gray-300" />
        </span>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] text-gray-900">
          {post.content || "Untitled post"}
        </p>
        <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-2 py-0.5 text-[11px] text-gray-500">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: platform?.color ?? "#6b7280" }}
          />
          {platform?.label ?? post.platform}
        </span>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold text-gray-900 tabular-nums">
          {formatNumber(engagement)}
        </p>
        <p className="text-[11px] text-gray-500">engagements</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ResultsPage() {
  const { useGet } = useApi();

  const { data: overviewData, isLoading: overviewLoading } = useGet(
    appRouter.api.analytics,
    { period: "30d" }
  ) as { data: OverviewData | undefined; isLoading: boolean };

  const { data: postsData, isLoading: postsLoading } = useGet(
    appRouter.api.analyticsPosts,
    { limit: "5", fromDate: FROM_DATE }
  ) as { data: { posts: ResultPost[] } | undefined; isLoading: boolean };

  const isLoading = overviewLoading || postsLoading;
  const kpis = overviewData?.kpis;
  const topPosts = postsData?.posts ?? [];

  const hasData =
    (kpis &&
      (kpis.followerGrowth.value > 0 ||
        kpis.posts.value > 0 ||
        kpis.engagement.value > 0 ||
        kpis.impressions.value > 0)) ||
    topPosts.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Results" subtitle="What worked over the last 30 days." />

      {isLoading ? (
        <div className="flex justify-center py-24">
          <SpinnerGapIcon className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      ) : !hasData ? (
        <p className="py-24 text-center text-sm text-gray-500">
          Results show up here once your posts have been live for a few days.
        </p>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Followers"
              value={formatNumber(kpis?.followerGrowth.value ?? 0)}
            />
            <KpiCard
              label="Posts published"
              value={String(kpis?.posts.value ?? 0)}
            />
            <KpiCard
              label="Engagement"
              value={formatNumber(kpis?.engagement.value ?? 0)}
            />
            <KpiCard
              label="Views"
              value={formatNumber(kpis?.impressions.value ?? 0)}
            />
          </div>

          {/* Top posts */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold tracking-tight text-gray-900">
              Top posts
            </h2>
            {topPosts.length > 0 ? (
              <div className="mt-2">
                {topPosts.map((post) => (
                  <TopPostRow key={post._id} post={post} />
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-gray-500">
                No post results yet.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
