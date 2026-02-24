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
