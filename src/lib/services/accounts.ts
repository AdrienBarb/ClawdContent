import { prisma } from "@/lib/db/prisma";
import {
  getConnectUrl as lateGetConnectUrl,
  listAccounts as lateListAccounts,
} from "@/lib/late/mutations";
import {
  buildAccountsContext,
  updateContainerEnvVars,
} from "./provisioning";

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

export async function syncAccountsFromLate(userId: string): Promise<void> {
  const lateProfile = await prisma.lateProfile.findUnique({
    where: { userId },
  });

  if (!lateProfile) {
    throw new Error("Late profile not found");
  }

  const accounts = await lateListAccounts(
    lateProfile.lateProfileId,
    lateProfile.lateApiKey
  );

  // Upsert each account from Late
  for (const account of accounts) {
    await prisma.socialAccount.upsert({
      where: { lateAccountId: account.id },
      create: {
        lateProfileId: lateProfile.id,
        lateAccountId: account.id,
        platform: account.platform,
        username: account.username,
        status: "active",
      },
      update: {
        platform: account.platform,
        username: account.username,
        status: "active",
      },
    });
  }

  // Mark accounts no longer in Late as disconnected
  const lateAccountIds = accounts.map((a) => a.id);
  await prisma.socialAccount.updateMany({
    where: {
      lateProfileId: lateProfile.id,
      lateAccountId: { notIn: lateAccountIds },
      status: "active",
    },
    data: { status: "disconnected" },
  });

  // Update container with new accounts context
  const context = await buildAccountsContext(userId);
  await updateContainerEnvVars(userId, {
    LATE_ACCOUNTS_CONTEXT: context,
  }).catch((err) =>
    console.error(`Failed to update container env vars: ${err}`)
  );
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

  await prisma.socialAccount.update({
    where: {
      id: accountId,
      lateProfileId: lateProfile.id,
    },
    data: { status: "disconnected" },
  });

  // Update container with new accounts context
  const context = await buildAccountsContext(userId);
  await updateContainerEnvVars(userId, {
    LATE_ACCOUNTS_CONTEXT: context,
  }).catch((err) =>
    console.error(`Failed to update container env vars: ${err}`)
  );
}
