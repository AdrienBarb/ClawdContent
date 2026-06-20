import { prisma } from "@/lib/db/prisma";
import {
  createProfile,
  createScopedApiKey,
  deleteAccount,
  deleteProfile,
  deleteScopedApiKey,
  findScopedKeyId,
  listAccounts,
  listApiKeys,
} from "@/lib/late/mutations";

/**
 * Run a best-effort Zernio delete: swallow "already gone" (404) and never let a
 * single failure abort the rest of the cleanup. The lifecycle cleanup must be
 * idempotent — re-running it on a partially-deleted profile is safe.
 */
async function bestEffort(label: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/ failed \(404\)/.test(msg)) {
      console.log(`[lifecycle:cleanup] ${label} already gone (404) — skipping`);
      return;
    }
    // Log and continue — best-effort cleanup must not throw. Truncate: a failed
    // /api-keys call echoes the full key listing in its body, so never log the
    // untruncated message (matches the no-secrets-in-logs convention).
    console.error(
      `[lifecycle:cleanup] ${label} failed (continuing): ${msg.slice(0, 180)}`
    );
  }
}

/**
 * Tear down a Zernio profile and everything under it, using the MASTER key
 * (the per-user scoped key may already be gone). Order: revoke each connected
 * account → delete the scoped API key → delete the profile. Idempotent and
 * never throws. Reused by both cleanupUserProfile (churn/cancel) and the
 * orphan-reaper backstop. Does NOT touch the DB — the caller owns DB rows.
 */
export async function purgeZernioProfile(lateProfileId: string): Promise<void> {
  // 1) Revoke connected accounts (master key reads/deletes any profile's accounts).
  let accounts: { id: string }[] = [];
  await bestEffort(`list accounts for ${lateProfileId}`, async () => {
    accounts = await listAccounts(lateProfileId);
  });
  for (const acc of accounts) {
    await bestEffort(`delete account ${acc.id}`, () => deleteAccount(acc.id));
  }

  // 2) Delete the scoped API key (id isn't in our DB — resolve via master list).
  await bestEffort(`delete scoped key for ${lateProfileId}`, async () => {
    const keys = await listApiKeys();
    const keyId = findScopedKeyId(lateProfileId, keys);
    if (keyId) await deleteScopedApiKey(keyId);
  });

  // 3) Delete the profile itself.
  await bestEffort(`delete profile ${lateProfileId}`, () =>
    deleteProfile(lateProfileId)
  );
}

export async function ensureUserProfile(
  userId: string,
  userName: string
): Promise<{ profileId: string; apiKey: string }> {
  const existing = await prisma.lateProfile.findUnique({
    where: { userId },
  });

  if (existing) {
    return { profileId: existing.lateProfileId, apiKey: existing.lateApiKey };
  }

  const profile = await createProfile(`postclaw-${userId}`);
  const scopedKey = await createScopedApiKey(profile.id);

  const lateProfile = await prisma.lateProfile.create({
    data: {
      userId,
      lateProfileId: profile.id,
      lateApiKey: scopedKey.key,
      profileName: userName,
    },
  });

  return { profileId: lateProfile.lateProfileId, apiKey: lateProfile.lateApiKey };
}

/**
 * Fully deprovision a user's Zernio side, then drop the local rows. Keeps the
 * User row (so the person can return and re-provision via getConnectUrl).
 * Idempotent and never throws. Called on subscription cancellation, by the
 * weekly reaper (non-converters), and the daily orphan backstop.
 */
export async function cleanupUserProfile(userId: string): Promise<void> {
  const lateProfile = await prisma.lateProfile.findUnique({
    where: { userId },
    select: { lateProfileId: true },
  });

  // Tear down the Zernio side FIRST (accounts → scoped key → profile), so a
  // crash mid-way leaves the DB row as a marker for the next reconcile pass.
  if (lateProfile) {
    await purgeZernioProfile(lateProfile.lateProfileId);
  }

  // Then drop local rows (socialAccounts cascade via lateProfile, but delete
  // explicitly to be order-independent).
  await prisma.socialAccount.deleteMany({
    where: { lateProfile: { userId } },
  });
  await prisma.lateProfile.deleteMany({ where: { userId } });
  console.log(`[lifecycle:cleanup] purged Zernio + DB profile for user ${userId}`);
}

export function formatUserContext(user: {
  knowledgeBase: unknown;
}): string {
  if (!user.knowledgeBase || typeof user.knowledgeBase !== "object") {
    return "No business profile provided yet.";
  }

  const kb = user.knowledgeBase as Record<string, unknown>;

  // Legacy users who were backfilled with { source: "legacy" } only
  if (kb.source === "legacy" && !kb.businessName) {
    return "No business profile provided yet.";
  }

  const parts: string[] = [];

  if (typeof kb.businessName === "string") parts.push(`Business: ${kb.businessName}`);
  if (typeof kb.description === "string") parts.push(`Description: ${kb.description}`);
  if (Array.isArray(kb.services) && kb.services.length > 0) {
    parts.push(`Services: ${kb.services.join(", ")}`);
  }

  return parts.length > 0
    ? parts.join("\n")
    : "No business profile provided yet.";
}

export async function buildAccountsContext(userId: string): Promise<string> {
  const lateProfile = await prisma.lateProfile.findUnique({
    where: { userId },
    include: { socialAccounts: { where: { status: "active" } } },
  });

  if (!lateProfile || lateProfile.socialAccounts.length === 0) {
    return "No accounts connected yet.";
  }

  return lateProfile.socialAccounts
    .map((a) => `- ${a.platform}: @${a.username}`)
    .join("\n");
}
