import { prisma } from "@/lib/db/prisma";
import {
  createProfile,
  createScopedApiKey,
} from "@/lib/late/mutations";
import {
  deployOpenClawContainer,
  deleteService,
  setServiceVariables,
} from "@/lib/railway/mutations";

const DOCKER_IMAGE = "ghcr.io/adrienbarb/postclaw-agent:latest";

export async function provisionUser(
  userId: string,
  userName: string
): Promise<void> {
  // Guard against double provisioning
  const existing = await prisma.railwayService.findUnique({
    where: { userId },
  });
  if (existing) {
    console.log(`User ${userId} already has a Railway service, skipping`);
    return;
  }

  // 1. Reuse existing Late profile or create a new one
  let lateProfile = await prisma.lateProfile.findUnique({
    where: { userId },
    include: { socialAccounts: { where: { status: "active" } } },
  });

  if (!lateProfile) {
    const profile = await createProfile(`postclaw-${userId}`);
    const scopedKey = await createScopedApiKey(profile.id);

    lateProfile = await prisma.lateProfile.create({
      data: {
        userId,
        lateProfileId: profile.id,
        lateApiKey: scopedKey.key,
        profileName: userName,
      },
      include: { socialAccounts: { where: { status: "active" } } },
    });
  }

  // 2. Deploy Railway container (reuse accounts context if re-subscribing)
  const accountsContext = formatAccountsContext(lateProfile.socialAccounts);
  const serviceName = `postclaw-${userId.slice(0, 8)}`;
  const envVars: Record<string, string> = {
    LATE_API_KEY: lateProfile.lateApiKey,
    LATE_PROFILE_ID: lateProfile.lateProfileId,
    LATE_ACCOUNTS_CONTEXT: accountsContext,
    MOONSHOT_API_KEY: process.env.MOONSHOT_API_KEY ?? "",
    OVERWRITE_SOUL: "true",
  };

  try {
    await prisma.railwayService.create({
      data: {
        userId,
        serviceId: "pending",
        environmentId: "pending",
        status: "deploying",
      },
    });

    const { service, environmentId } = await deployOpenClawContainer({
      name: serviceName,
      image: DOCKER_IMAGE,
      envVars,
    });

    await prisma.railwayService.update({
      where: { userId },
      data: {
        serviceId: service.id,
        environmentId,
        status: "running",
      },
    });
  } catch (error) {
    console.error(`Failed to deploy Railway container for user ${userId}:`, error);
    await prisma.railwayService.update({
      where: { userId },
      data: { status: "failed" },
    });

    throw error;
  }
}

export async function retryProvisionUser(
  userId: string,
  userName: string
): Promise<void> {
  const existing = await prisma.railwayService.findUnique({
    where: { userId },
  });

  // Only allow retry if no service exists or it failed
  if (existing && existing.status !== "failed") {
    throw new Error("Provisioning already in progress or completed");
  }

  // Clean up failed records so provisionUser can start fresh
  if (existing) {
    await prisma.railwayService.delete({ where: { userId } });
  }

  await provisionUser(userId, userName);
}

export async function deprovisionUser(userId: string): Promise<void> {
  const railwayService = await prisma.railwayService.findUnique({
    where: { userId },
  });

  if (railwayService && railwayService.serviceId !== "pending") {
    await deleteService(railwayService.serviceId).catch((err) =>
      console.error(`Failed to delete Railway service: ${err}`)
    );
  }

  await prisma.railwayService.deleteMany({ where: { userId } });

  // Clean up social accounts and Late profile
  await prisma.socialAccount.deleteMany({
    where: { lateProfile: { userId } },
  });
  await prisma.lateProfile.deleteMany({ where: { userId } });
}

export async function updateContainerEnvVars(
  userId: string,
  variables: Record<string, string>
): Promise<void> {
  const railwayService = await prisma.railwayService.findUnique({
    where: { userId },
  });

  if (!railwayService || railwayService.serviceId === "pending") {
    throw new Error("No active Railway service found for user");
  }

  await setServiceVariables({
    serviceId: railwayService.serviceId,
    environmentId: railwayService.environmentId,
    variables: { ...variables, OVERWRITE_SOUL: "true" },
  });
}

const NO_ACCOUNTS_MESSAGE =
  "  No accounts connected yet. Ask your owner to connect accounts from the dashboard.";

function formatAccountsContext(
  accounts: { platform: string; username: string; lateAccountId: string }[]
): string {
  if (accounts.length === 0) return NO_ACCOUNTS_MESSAGE;

  return accounts
    .map(
      (a) =>
        `  - ${a.platform}: @${a.username} (accountId: ${a.lateAccountId})`
    )
    .join("\n");
}

export async function buildAccountsContext(userId: string): Promise<string> {
  const lateProfile = await prisma.lateProfile.findUnique({
    where: { userId },
    include: { socialAccounts: { where: { status: "active" } } },
  });

  if (!lateProfile) return NO_ACCOUNTS_MESSAGE;

  return formatAccountsContext(lateProfile.socialAccounts);
}
