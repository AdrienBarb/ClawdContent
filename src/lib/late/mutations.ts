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

// Rich platform info from Late API post response
interface LatePostPlatformRaw {
  platform: string;
  accountId:
    | {
        _id: string;
        platform: string;
        username: string;
        displayName: string;
        isActive: boolean;
      }
    | string;
  status: string;
}

export interface LatePostPlatform {
  platform: string;
  accountId: string;
  username: string;
  displayName: string;
  status: string;
}

interface LatePostRaw {
  _id: string;
  content: string;
  platforms: LatePostPlatformRaw[] | string[];
  status: string;
  scheduledFor: string | null;
  scheduledAt?: string | null; // Legacy field name
  publishedAt?: string | null;
  platformPostUrl?: Record<string, string>;
  mediaItems?: Array<{ type: string; url: string }>;
  createdAt: string;
  updatedAt?: string;
}

export interface LatePost {
  id: string;
  content: string;
  platforms: LatePostPlatform[];
  platformIds: string[]; // Flat list of platform IDs for simple use
  status: string;
  scheduledFor: string | null;
  publishedAt: string | null;
  platformPostUrl: Record<string, string>;
  mediaItems: Array<{ type: string; url: string }>;
  createdAt: string;
}

function normalizePlatforms(
  platforms: LatePostPlatformRaw[] | string[]
): { platforms: LatePostPlatform[]; platformIds: string[] } {
  if (!platforms || platforms.length === 0) {
    return { platforms: [], platformIds: [] };
  }

  // Handle string[] (simplified format)
  if (typeof platforms[0] === "string") {
    const ids = platforms as string[];
    return {
      platforms: ids.map((id) => ({
        platform: id,
        accountId: "",
        username: "",
        displayName: "",
        status: "unknown",
      })),
      platformIds: ids,
    };
  }

  // Handle object[] (rich format)
  const rich = platforms as LatePostPlatformRaw[];
  return {
    platforms: rich.map((p) => ({
      platform: p.platform,
      accountId: typeof p.accountId === "string" ? p.accountId : p.accountId._id,
      username: typeof p.accountId === "string" ? "" : p.accountId.username,
      displayName: typeof p.accountId === "string" ? "" : p.accountId.displayName,
      status: p.status,
    })),
    platformIds: rich.map((p) => p.platform),
  };
}

function normalizePost(p: LatePostRaw): LatePost {
  const { platforms, platformIds } = normalizePlatforms(p.platforms);
  return {
    id: p._id,
    content: p.content,
    platforms,
    platformIds,
    status: p.status,
    scheduledFor: p.scheduledFor ?? p.scheduledAt ?? null,
    publishedAt: p.publishedAt ?? null,
    platformPostUrl: p.platformPostUrl ?? {},
    mediaItems: p.mediaItems ?? [],
    createdAt: p.createdAt,
  };
}

export interface ListPostsOptions {
  status?: string;
  limit?: number;
  page?: number;
  sortBy?: string;
}

export interface ListPostsResult {
  posts: LatePost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
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

export async function listPosts(
  profileId: string,
  apiKey: string,
  options?: ListPostsOptions
): Promise<ListPostsResult> {
  const params = new URLSearchParams({ profileId });
  if (options?.status) params.set("status", options.status);
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.page) params.set("page", String(options.page));
  if (options?.sortBy) params.set("sortBy", options.sortBy);

  const data = await lateRequest<{
    posts: LatePostRaw[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }>(`/posts?${params.toString()}`, { apiKey });

  return {
    posts: data.posts.map(normalizePost),
    pagination: data.pagination ?? {
      page: options?.page ?? 1,
      limit: options?.limit ?? 10,
      total: data.posts.length,
      pages: 1,
    },
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

export async function updatePost(
  postId: string,
  apiKey: string,
  data: { scheduledFor?: string; content?: string }
): Promise<LatePost> {
  const result = await lateRequest<{ post: LatePostRaw }>(
    `/posts/${postId}`,
    {
      method: "PUT",
      apiKey,
      body: data,
    }
  );
  return normalizePost(result.post);
}

export async function unpublishPost(
  postId: string,
  platform: string,
  apiKey: string
): Promise<void> {
  await lateRequest(`/posts/${postId}/unpublish`, {
    method: "POST",
    apiKey,
    body: { platform },
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
