import { prisma } from "@/lib/db/prisma";
import {
  getConnectUrl as lateGetConnectUrl,
  deleteAccount as lateDeleteAccount,
  getAccountsHealth,
} from "@/lib/late/mutations";

export async function getConnectedAccounts(userId: string) {
  const lateProfile = await prisma.lateProfile.findUnique({
    where: { userId },
    include: { socialAccounts: true },
  });

  return lateProfile?.socialAccounts ?? [];
}

export async function getConnectUrl(
  userId: string,
  platform: string,
  redirectUrl: string
): Promise<string> {
  const lateProfile = await prisma.lateProfile.findUnique({
    where: { userId },
  });

  if (!lateProfile) {
    throw new Error("Late profile not found. Please wait for provisioning to complete.");
  }

  return lateGetConnectUrl(
    platform,
    lateProfile.lateProfileId,
    redirectUrl,
    lateProfile.lateApiKey
  );
}

export interface SyncResult {
  newAccounts: { id: string; platform: string }[];
}

export async function syncAccountsFromLate(userId: string): Promise<SyncResult> {
  const lateProfile = await prisma.lateProfile.findUnique({
    where: { userId },
    include: { socialAccounts: { select: { lateAccountId: true } } },
  });

  if (!lateProfile) {
    throw new Error("Late profile not found");
  }

  const existingLateIds = new Set(lateProfile.socialAccounts.map((a) => a.lateAccountId));

  // Use health endpoint for detailed token status (tokenValid + needsReconnect)
  const health = await getAccountsHealth(
    lateProfile.lateProfileId,
    lateProfile.lateApiKey
  );
  const accountStatuses = health.accounts.map((a) => ({
    id: a.accountId,
    platform: a.platform,
    username: a.username,
    isActive: a.tokenValid && !a.needsReconnect,
  }));

  // Upsert each account from Zernio with its real status
  const newAccounts: { id: string; platform: string }[] = [];

  for (const account of accountStatuses) {
    const status = account.isActive ? "active" : "disconnected";
    const isNew = !existingLateIds.has(account.id);

    const result = await prisma.socialAccount.upsert({
      where: { lateAccountId: account.id },
      create: {
        lateProfileId: lateProfile.id,
        lateAccountId: account.id,
        platform: account.platform,
        username: account.username,
        status,
      },
      update: {
        platform: account.platform,
        username: account.username,
        status,
      },
    });

    if (isNew && status === "active") {
      newAccounts.push({ id: result.id, platform: result.platform });
    }
  }

  // Mark accounts no longer in Zernio at all as disconnected
  const lateAccountIds = accountStatuses.map((a) => a.id);
  await prisma.socialAccount.updateMany({
    where: {
      lateProfileId: lateProfile.id,
      lateAccountId: { notIn: lateAccountIds },
      status: "active",
    },
    data: { status: "disconnected" },
  });

  return { newAccounts };
}

export async function disconnectAccount(
  userId: string,
  accountId: string
): Promise<void> {
  const lateProfile = await prisma.lateProfile.findUnique({
    where: { userId },
  });

  if (!lateProfile) {
    throw new Error("Late profile not found");
  }

  // Find the account to get the Zernio account ID
  const account = await prisma.socialAccount.findUnique({
    where: {
      id: accountId,
      lateProfileId: lateProfile.id,
    },
  });

  if (!account) {
    throw new Error("Account not found");
  }

  // Revoke OAuth token in Zernio
  await lateDeleteAccount(account.lateAccountId, lateProfile.lateApiKey).catch(
    (err) => console.error(`Failed to revoke Zernio account: ${err}`)
  );

  await prisma.socialAccount.update({
    where: {
      id: accountId,
      lateProfileId: lateProfile.id,
    },
    data: { status: "disconnected" },
  });
}

export async function removeAccount(
  userId: string,
  accountId: string
): Promise<void> {
  const lateProfile = await prisma.lateProfile.findUnique({
    where: { userId },
  });

  if (!lateProfile) {
    throw new Error("Late profile not found");
  }

  const account = await prisma.socialAccount.findUnique({
    where: {
      id: accountId,
      lateProfileId: lateProfile.id,
    },
  });

  if (!account) {
    throw new Error("Account not found");
  }

  // Revoke OAuth in Zernio if still active
  if (account.status === "active") {
    await lateDeleteAccount(account.lateAccountId, lateProfile.lateApiKey).catch(
      (err) => console.error(`Failed to revoke Zernio account: ${err}`)
    );
  }

  // Delete from DB
  await prisma.socialAccount.delete({
    where: {
      id: accountId,
      lateProfileId: lateProfile.id,
    },
  });
}
