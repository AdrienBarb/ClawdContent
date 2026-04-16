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
