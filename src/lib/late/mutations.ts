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
  errorMessage: string | null;
  errorCategory: string | null;
  errorSource: string | null;
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

export async function listPosts(
  profileId: string,
  apiKey: string,
  options?: { status?: string; limit?: number }
): Promise<LatePost[]> {
  const params = new URLSearchParams({ profileId });
  if (options?.status) params.set("status", options.status);
  if (options?.limit) params.set("limit", String(options.limit));

  const data = await lateRequest<{ posts: LatePostRaw[] }>(
    `/posts?${params.toString()}`,
    { apiKey }
  );
  return data.posts.map((p) => ({
    id: p._id,
    content: p.content,
    platforms: p.platforms,
    mediaItems: p.mediaItems ?? [],
    status: p.status,
    scheduledAt: p.scheduledFor,
    publishedAt: p.publishedAt,
    createdAt: p.createdAt,
  }));
}

export async function getPost(
  postId: string,
  apiKey: string
): Promise<LatePostDetail> {
  const data = await lateRequest<{
    _id: string;
    content: string;
    platforms: LatePostPlatform[];
    mediaItems?: LateMediaItem[];
    status: string;
    scheduledFor: string | null;
    publishedAt: string | null;
    createdAt: string;
    errorMessage?: string;
    errorCategory?: string;
    errorSource?: string;
  }>(`/posts/${postId}`, { apiKey });
  return {
    id: data._id,
    content: data.content,
    platforms: data.platforms,
    mediaItems: data.mediaItems ?? [],
    status: data.status,
    scheduledAt: data.scheduledFor,
    publishedAt: data.publishedAt,
    createdAt: data.createdAt,
    errorMessage: data.errorMessage ?? null,
    errorCategory: data.errorCategory ?? null,
    errorSource: data.errorSource ?? null,
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
): Promise<LateAccount[]> {
  const data = await lateRequest<{ accounts: LateAccountRaw[] }>(
    `/accounts?profileId=${profileId}`,
    { apiKey }
  );
  return data.accounts
    .filter((a) => a.isActive)
    .map((a) => ({
      id: a._id,
      platform: a.platform,
      username: a.username,
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

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export interface PostAnalytics {
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

export interface AnalyticsPagination {
  limit: number;
  offset: number;
  total: number;
}

export interface DailyMetric {
  date: string;
  postCount: number;
  platformDistribution: Record<string, number>;
  totalImpressions: number;
  totalReach: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalSaves: number;
  totalClicks: number;
  totalViews: number;
}

export interface FollowerStat {
  accountId: string;
  platform: string;
  followers: { date: string; count: number }[];
}

export interface BestTime {
  dayOfWeek: string;
  hour: number;
  averageEngagement: number;
}

export async function getAnalytics(
  apiKey: string,
  options?: {
    postId?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ data: PostAnalytics[]; pagination: AnalyticsPagination }> {
  const params = new URLSearchParams();
  if (options?.postId) params.set("postId", options.postId);
  if (options?.fromDate) params.set("fromDate", options.fromDate);
  if (options?.toDate) params.set("toDate", options.toDate);
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.offset) params.set("offset", String(options.offset));

  const qs = params.toString();
  return lateRequest(`/analytics/get-analytics${qs ? `?${qs}` : ""}`, {
    apiKey,
  });
}

export async function getDailyMetrics(
  apiKey: string,
  options?: { startDate?: string; endDate?: string; platform?: string }
): Promise<{ dailyMetrics: DailyMetric[] }> {
  const params = new URLSearchParams();
  if (options?.startDate) params.set("startDate", options.startDate);
  if (options?.endDate) params.set("endDate", options.endDate);
  if (options?.platform) params.set("platform", options.platform);

  const qs = params.toString();
  return lateRequest(`/analytics/daily-metrics${qs ? `?${qs}` : ""}`, {
    apiKey,
  });
}

export async function getFollowerStats(
  apiKey: string,
  options?: { accountId?: string; platform?: string }
): Promise<{ followerStats: FollowerStat[] }> {
  const params = new URLSearchParams();
  if (options?.accountId) params.set("accountId", options.accountId);
  if (options?.platform) params.set("platform", options.platform);

  const qs = params.toString();
  return lateRequest(`/accounts/follower-stats${qs ? `?${qs}` : ""}`, {
    apiKey,
  });
}

export async function getBestTimeToPost(
  apiKey: string,
  options?: { platform?: string }
): Promise<{ bestTimes: BestTime[] }> {
  const params = new URLSearchParams();
  if (options?.platform) params.set("platform", options.platform);

  const qs = params.toString();
  return lateRequest(
    `/analytics/get-best-time-to-post${qs ? `?${qs}` : ""}`,
    { apiKey }
  );
}
