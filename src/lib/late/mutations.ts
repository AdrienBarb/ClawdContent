import { lateRequest } from "./client";

interface LateProfile {
  id: string;
  name: string;
}

interface LateApiKey {
  id: string;
  key: string;
}

interface LateAccountRaw {
  _id: string;
  platform: string;
  username: string;
  isActive: boolean;
}

export interface LateAccount {
  id: string;
  platform: string;
  username: string;
}

export async function createProfile(name: string): Promise<LateProfile> {
  const data = await lateRequest<{ profile: { _id: string; name: string } }>(
    "/profiles",
    {
      method: "POST",
      body: { name },
    }
  );
  return { id: data.profile._id, name: data.profile.name };
}

export async function createScopedApiKey(
  profileId: string
): Promise<LateApiKey> {
  const data = await lateRequest<{
    apiKey: { id: string; key: string };
  }>("/api-keys", {
    method: "POST",
    body: {
      name: `postclaw-${profileId}`,
      scope: "profiles",
      profileIds: [profileId],
      permission: "read-write",
    },
  });
  return { id: data.apiKey.id, key: data.apiKey.key };
}

export async function deleteScopedApiKey(apiKeyId: string): Promise<void> {
  await lateRequest(`/api-keys/${apiKeyId}`, {
    method: "DELETE",
  });
}

export async function getConnectUrl(
  platform: string,
  profileId: string,
  redirectUrl: string,
  apiKey: string
): Promise<string> {
  const data = await lateRequest<{ authUrl: string }>(
    `/connect/${platform}?profileId=${profileId}&redirect_url=${encodeURIComponent(redirectUrl)}`,
    { apiKey }
  );
  return data.authUrl;
}

export interface LatePostPlatform {
  platform: string;
  accountId?: string;
  profileId?: string;
  status?: string;
  scheduledFor?: string | null;
  [key: string]: unknown;
}

export interface LateMediaItem {
  url: string;
  type: string;
}

export interface LatePost {
  id: string;
  content: string;
  platforms: LatePostPlatform[];
  mediaItems: LateMediaItem[];
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
}

export interface LatePostDetail extends LatePost {
  /** Per-platform error details (from PlatformTarget entries). */
  platformErrors: {
    platform: string;
    errorMessage: string | null;
    errorCategory: string | null;
    errorSource: string | null;
  }[];
}

interface LatePostRaw {
  _id: string;
  content: string;
  platforms: LatePostPlatform[];
  mediaItems?: LateMediaItem[];
  status: string;
  scheduledFor: string | null;
  publishedAt: string | null;
  createdAt: string;
}

export interface PaginatedPosts {
  posts: LatePost[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export async function listPosts(
  profileId: string,
  apiKey: string,
  options?: { status?: string; limit?: number; page?: number }
): Promise<PaginatedPosts> {
  const params = new URLSearchParams({ profileId });
  if (options?.status) params.set("status", options.status);
  params.set("limit", String(options?.limit ?? 20));
  if (options?.page) params.set("page", String(options.page));

  const data = await lateRequest<{
    posts: LatePostRaw[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }>(`/posts?${params.toString()}`, { apiKey });

  return {
    posts: data.posts.map((p) => ({
      id: p._id,
      content: p.content,
      platforms: p.platforms,
      mediaItems: p.mediaItems ?? [],
      status: p.status,
      scheduledAt: p.scheduledFor,
      publishedAt: p.publishedAt,
      createdAt: p.createdAt,
    })),
    pagination: data.pagination,
  };
}

export async function getPost(
  postId: string,
  apiKey: string
): Promise<LatePostDetail> {
  const data = await lateRequest<{
    post: {
      _id: string;
      content: string;
      platforms: (LatePostPlatform & {
        errorMessage?: string;
        errorCategory?: string;
        errorSource?: string;
      })[];
      mediaItems?: LateMediaItem[];
      status: string;
      scheduledFor: string | null;
      publishedAt: string | null;
      createdAt: string;
    };
  }>(`/posts/${postId}`, { apiKey });
  const p = data.post;
  return {
    id: p._id,
    content: p.content,
    platforms: p.platforms,
    mediaItems: p.mediaItems ?? [],
    status: p.status,
    scheduledAt: p.scheduledFor,
    publishedAt: p.publishedAt,
    createdAt: p.createdAt,
    platformErrors: p.platforms
      .filter((pt) => pt.errorMessage || pt.errorCategory || pt.errorSource)
      .map((pt) => ({
        platform: pt.platform,
        errorMessage: pt.errorMessage ?? null,
        errorCategory: pt.errorCategory ?? null,
        errorSource: pt.errorSource ?? null,
      })),
  };
}

export async function deletePost(
  postId: string,
  apiKey: string
): Promise<void> {
  await lateRequest(`/posts/${postId}`, {
    method: "DELETE",
    apiKey,
  });
}

export async function listAccounts(
  profileId: string,
  apiKey: string
): Promise<(LateAccount & { isActive: boolean })[]> {
  const data = await lateRequest<{ accounts: LateAccountRaw[] }>(
    `/accounts?profileId=${profileId}`,
    { apiKey }
  );
  return data.accounts.map((a) => ({
    id: a._id,
    platform: a.platform,
    username: a.username,
    isActive: a.isActive,
  }));
}

export async function deleteAccount(
  accountId: string,
  apiKey: string
): Promise<void> {
  await lateRequest(`/accounts/${accountId}`, {
    method: "DELETE",
    apiKey,
  });
}

export async function retryPost(
  postId: string,
  apiKey: string
): Promise<void> {
  await lateRequest(`/posts/${postId}/retry`, {
    method: "POST",
    apiKey,
  });
}

export async function unpublishPost(
  postId: string,
  platform: string,
  apiKey: string
): Promise<void> {
  await lateRequest(`/posts/${postId}/unpublish`, {
    method: "POST",
    body: { platform },
    apiKey,
  });
}

export async function updatePost(
  postId: string,
  data: { content?: string; scheduledAt?: string },
  apiKey: string
): Promise<void> {
  const { scheduledAt, ...rest } = data;
  await lateRequest(`/posts/${postId}`, {
    method: "PUT",
    body: {
      ...rest,
      ...(scheduledAt !== undefined && { scheduledFor: scheduledAt }),
    },
    apiKey,
  });
}

export async function createPost(
  profileId: string,
  data: {
    content: string;
    platform: { platform: string; accountId?: string };
    scheduledAt?: string;
    publishNow?: boolean;
    mediaItems?: { url: string; type: string }[];
    timezone?: string;
  },
  apiKey: string
): Promise<LatePost> {
  const body: Record<string, unknown> = {
    content: data.content,
    profileId,
    platforms: [data.platform],
  };

  if (data.scheduledAt) {
    body.scheduledFor = data.scheduledAt;
  } else if (data.publishNow !== false) {
    // Publish immediately by default (without publishNow, Zernio defaults to draft)
    body.publishNow = true;
  }

  if (data.timezone) body.timezone = data.timezone;
  if (data.mediaItems && data.mediaItems.length > 0)
    body.mediaItems = data.mediaItems;

  const raw = await lateRequest<{ post: LatePostRaw }>("/posts", {
    method: "POST",
    body,
    apiKey,
  });
  const p = raw.post;
  return {
    id: p._id,
    content: p.content,
    platforms: p.platforms,
    mediaItems: p.mediaItems ?? [],
    status: p.status,
    scheduledAt: p.scheduledFor,
    publishedAt: p.publishedAt,
    createdAt: p.createdAt,
  };
}

export async function uploadMedia(
  url: string,
  type: string,
  apiKey: string
): Promise<{ id: string; url: string }> {
  const data = await lateRequest<{ media: { _id: string; url: string } }>(
    "/media/upload",
    {
      method: "POST",
      body: { url, type },
      apiKey,
    }
  );
  return { id: data.media._id, url: data.media.url };
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

// GET /v1/analytics — post-level metrics
export interface AnalyticsPost {
  _id: string;
  latePostId: string | null;
  content: string;
  publishedAt: string | null;
  status: string;
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

export interface AnalyticsResponse {
  overview: {
    totalPosts: number;
    publishedPosts: number;
    scheduledPosts: number;
  };
  posts: AnalyticsPost[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

// GET /v1/analytics/daily-metrics
export interface DailyMetric {
  date: string;
  postCount: number;
  platforms: Record<string, number>;
  metrics: {
    impressions: number;
    reach: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    clicks: number;
    views: number;
  };
}

export interface DailyMetricsResponse {
  dailyData: DailyMetric[];
  platformBreakdown: {
    platform: string;
    postCount: number;
    impressions: number;
    reach: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    clicks: number;
    views: number;
  }[];
}

// GET /v1/accounts/follower-stats
export interface FollowerAccount {
  _id: string;
  platform: string;
  username: string;
  currentFollowers: number;
  growth: number;
  growthPercentage: number;
  dataPoints: number;
}

export interface FollowerStatsResponse {
  accounts: FollowerAccount[];
  stats: Record<string, { date: string; followers: number }[]>;
  dateRange: { from: string; to: string };
  granularity: string;
}

// GET /v1/analytics/best-time
export interface BestTimeSlot {
  day_of_week: number; // 0=Monday, 6=Sunday
  hour: number; // 0-23 UTC
  avg_engagement: number;
  post_count: number;
}

export interface BestTimeResponse {
  slots: BestTimeSlot[];
}

export async function getAnalytics(
  apiKey: string,
  options?: {
    postId?: string;
    platform?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
    page?: number;
    sortBy?: string;
    order?: string;
    source?: string;
  }
): Promise<AnalyticsResponse> {
  const params = new URLSearchParams();
  params.set("source", options?.source ?? "all");
  if (options?.postId) params.set("postId", options.postId);
  if (options?.platform) params.set("platform", options.platform);
  if (options?.fromDate) params.set("fromDate", options.fromDate);
  if (options?.toDate) params.set("toDate", options.toDate);
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.page) params.set("page", String(options.page));
  if (options?.sortBy) params.set("sortBy", options.sortBy);
  if (options?.order) params.set("order", options.order);

  const qs = params.toString();
  return lateRequest(`/analytics?${qs}`, { apiKey });
}

export async function getDailyMetrics(
  apiKey: string,
  options?: {
    fromDate?: string;
    toDate?: string;
    platform?: string;
    source?: string;
  }
): Promise<DailyMetricsResponse> {
  const params = new URLSearchParams();
  params.set("source", options?.source ?? "all");
  if (options?.fromDate) params.set("fromDate", options.fromDate);
  if (options?.toDate) params.set("toDate", options.toDate);
  if (options?.platform) params.set("platform", options.platform);

  const qs = params.toString();
  return lateRequest(`/analytics/daily-metrics?${qs}`, { apiKey });
}

export async function getFollowerStats(
  apiKey: string,
  options?: { accountIds?: string; fromDate?: string; toDate?: string }
): Promise<FollowerStatsResponse> {
  const params = new URLSearchParams();
  if (options?.accountIds) params.set("accountIds", options.accountIds);
  if (options?.fromDate) params.set("fromDate", options.fromDate);
  if (options?.toDate) params.set("toDate", options.toDate);

  const qs = params.toString();
  return lateRequest(`/accounts/follower-stats${qs ? `?${qs}` : ""}`, {
    apiKey,
  });
}

// GET /v1/accounts/health — token validity and reconnection status
export interface AccountHealth {
  accountId: string;
  platform: string;
  username: string;
  status: "healthy" | "warning" | "error";
  canPost: boolean;
  tokenValid: boolean;
  needsReconnect: boolean;
  issues: string[];
}

export interface AccountsHealthResponse {
  summary: {
    total: number;
    healthy: number;
    warning: number;
    error: number;
    needsReconnect: number;
  };
  accounts: AccountHealth[];
}

export async function getAccountsHealth(
  profileId: string,
  apiKey: string
): Promise<AccountsHealthResponse> {
  return lateRequest(`/accounts/health?profileId=${profileId}`, { apiKey });
}

export async function getBestTimeToPost(
  apiKey: string,
  options?: { platform?: string; source?: string }
): Promise<BestTimeResponse> {
  const params = new URLSearchParams();
  if (options?.platform) params.set("platform", options.platform);
  if (options?.source) params.set("source", options.source);

  const qs = params.toString();
  return lateRequest(`/analytics/best-time${qs ? `?${qs}` : ""}`, { apiKey });
}
