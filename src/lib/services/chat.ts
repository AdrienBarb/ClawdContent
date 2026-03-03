import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";
import { updateMachineEnv } from "@/lib/fly/mutations";
import { getAppName } from "@/lib/fly/client";

interface ChatConfig {
  machineId: string;
  gatewayToken: string;
  appName: string;
}

export async function getChatConfig(userId: string): Promise<ChatConfig> {
  const flyMachine = await prisma.flyMachine.findUnique({
    where: { userId },
  });

  if (!flyMachine || flyMachine.machineId === "pending") {
    throw new Error("Your bot is not set up yet. Please wait for provisioning to complete.");
  }

  if (flyMachine.status !== "running") {
    throw new Error(`Your bot is currently ${flyMachine.status}. It needs to be running to chat.`);
  }

  // Lazy migration: generate gateway token for existing machines
  if (!flyMachine.gatewayToken) {
    const token = await ensureGatewayToken(userId, flyMachine.machineId);
    return { machineId: flyMachine.machineId, gatewayToken: token, appName: getAppName() };
  }

  return {
    machineId: flyMachine.machineId,
    gatewayToken: flyMachine.gatewayToken,
    appName: getAppName(),
  };
}

async function ensureGatewayToken(
  userId: string,
  machineId: string
): Promise<string> {
  const gatewayToken = crypto.randomUUID();

  await updateMachineEnv(machineId, {
    OPENCLAW_GATEWAY_TOKEN: gatewayToken,
  });

  await prisma.flyMachine.update({
    where: { userId },
    data: { gatewayToken },
  });

  return gatewayToken;
}
