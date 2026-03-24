import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  createProfile,
  createScopedApiKey,
} from "@/lib/late/mutations";
import {
  createVolume,
  createMachine,
  updateMachineEnv,
  deleteMachine,
  deleteVolume,
} from "@/lib/fly/mutations";

const DOCKER_IMAGE =
  process.env.OPENCLAW_DOCKER_IMAGE ||
  "ghcr.io/adrienbarb/postclaw-agent:latest";

export async function provisionUser(
  userId: string,
  userName: string
): Promise<void> {
  // Guard against double provisioning
  const existing = await prisma.flyMachine.findUnique({
    where: { userId },
  });
  if (existing) {
    console.log(`User ${userId} already has a Fly machine, skipping`);
    return;
  }

  // 0. Fetch user profile (timezone + onboarding data + pending token)
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      timezone: true,
      onboardingRole: true,
      onboardingNiche: true,
      onboardingTopics: true,
    },
  });

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

  // 2. Build env vars
  const gatewayToken = crypto.randomUUID();
  const accountsContext = formatAccountsContext(lateProfile.socialAccounts);
  const userContext = formatUserContext(user);
  const envVars: Record<string, string> = {
    ZERNIO_API_KEY: lateProfile.lateApiKey,
    ZERNIO_PROFILE_ID: lateProfile.lateProfileId,
    ZERNIO_ACCOUNTS_CONTEXT: accountsContext,
    USER_CONTEXT: userContext,
    MOONSHOT_API_KEY: process.env.MOONSHOT_API_KEY ?? "",
    BRAVE_API_KEY: process.env.BRAVE_API_KEY ?? "",
    OPENCLAW_GATEWAY_TOKEN: gatewayToken,
    OPENCLAW_GATEWAY_BIND: "lan",
    TZ: user.timezone ?? "UTC",
    OVERWRITE_SOUL: "true",
    NODE_OPTIONS: "--max-old-space-size=1536",
  };

  try {
    // Use try/catch on create to handle race conditions — if two concurrent
    // provisionUser() calls pass the findUnique guard simultaneously, the
    // unique constraint on userId will reject the second one.
    try {
      await prisma.flyMachine.create({
        data: {
          userId,
          machineId: "pending",
          status: "deploying",
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        console.log(
          `User ${userId} already has a Fly machine (race condition), skipping`
        );
        return;
      }
      throw err;
    }

    // 3. Create volume for persistent bot memory
    const sanitizedId = userId.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    const volumeName = `pc_${sanitizedId.slice(0, 26)}`;
    const volume = await createVolume(volumeName);

    // 4. Create machine — starts automatically with all config
    const machineName = `postclaw_${sanitizedId.slice(0, 20)}`;
    const machine = await createMachine({
      name: machineName,
      image: DOCKER_IMAGE,
      env: envVars,
      volumeId: volume.id,
    });

    await prisma.flyMachine.update({
      where: { userId },
      data: {
        machineId: machine.id,
        volumeId: volume.id,
        gatewayToken,
        status: "running",
      },
    });

  } catch (error) {
    console.error(`Failed to provision Fly machine for user ${userId}:`, error);
    await prisma.flyMachine.update({
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
  const existing = await prisma.flyMachine.findUnique({
    where: { userId },
  });

  // Only allow retry if no machine exists or it failed
  if (existing && existing.status !== "failed") {
    throw new Error("Provisioning already in progress or completed");
  }

  // Clean up failed records so provisionUser can start fresh
  if (existing) {
    await prisma.flyMachine.delete({ where: { userId } });
  }

  await provisionUser(userId, userName);
}

export async function deprovisionUser(userId: string): Promise<void> {
  const flyMachine = await prisma.flyMachine.findUnique({
    where: { userId },
  });

  if (flyMachine && flyMachine.machineId !== "pending") {
    await deleteMachine(flyMachine.machineId).catch((err) =>
      console.error(`Failed to delete Fly machine: ${err}`)
    );

    if (flyMachine.volumeId) {
      await deleteVolume(flyMachine.volumeId).catch((err) =>
        console.error(`Failed to delete Fly volume: ${err}`)
      );
    }
  }

  await prisma.flyMachine.deleteMany({ where: { userId } });

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
  const flyMachine = await prisma.flyMachine.findUnique({
    where: { userId },
  });

  if (!flyMachine || flyMachine.machineId === "pending") {
    throw new Error("No active Fly machine found for user");
  }

  await updateMachineEnv(flyMachine.machineId, {
    ...variables,
    OVERWRITE_SOUL: "true",
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

const ROLE_LABELS: Record<string, string> = {
  solopreneur: "Solopreneur / Indie Maker",
  startup_founder: "Startup Founder",
  freelancer: "Freelancer / Consultant",
  content_creator: "Content Creator",
  marketing_manager: "Marketing Manager",
};

export function formatUserContextFromData(user: {
  onboardingRole: string | null;
  onboardingNiche: string | null;
  onboardingTopics: string[];
}): string {
  return formatUserContext(user);
}

function formatUserContext(user: {
  onboardingRole: string | null;
  onboardingNiche: string | null;
  onboardingTopics: string[];
}): string {
  const parts: string[] = [];

  if (user.onboardingRole) {
    parts.push(`  Role: ${ROLE_LABELS[user.onboardingRole] ?? user.onboardingRole}`);
  }
  if (user.onboardingNiche) {
    parts.push(`  Niche: ${user.onboardingNiche}`);
  }
  if (user.onboardingTopics.length > 0) {
    parts.push(`  Topics: ${user.onboardingTopics.join(", ")}`);
  }

  return parts.length > 0
    ? parts.join("\n")
    : "  No profile information provided yet.";
}

export async function buildAccountsContext(userId: string): Promise<string> {
  const lateProfile = await prisma.lateProfile.findUnique({
    where: { userId },
    include: { socialAccounts: { where: { status: "active" } } },
  });

  if (!lateProfile) return NO_ACCOUNTS_MESSAGE;

  return formatAccountsContext(lateProfile.socialAccounts);
}
