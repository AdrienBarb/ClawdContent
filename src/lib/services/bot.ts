import { prisma } from "@/lib/db/prisma";
import { getMachine, mapFlyState, updateMachineEnv } from "@/lib/fly/mutations";
import { updateContainerEnvVars } from "./provisioning";

export async function getBotStatus(userId: string) {
  const flyMachine = await prisma.flyMachine.findUnique({
    where: { userId },
  });

  if (!flyMachine) return null;

  // If pending or already failed, return cached status
  if (flyMachine.machineId === "pending" || flyMachine.status === "failed") {
    return flyMachine;
  }

  // Fetch live status from Fly
  try {
    const machine = await getMachine(flyMachine.machineId);
    const mappedStatus = mapFlyState(machine.state);

    if (mappedStatus !== flyMachine.status) {
      await prisma.flyMachine.update({
        where: { userId },
        data: { status: mappedStatus },
      });
      return { ...flyMachine, status: mappedStatus };
    }
  } catch {
    // If we can't reach Fly, return cached status
  }

  return flyMachine;
}

export async function setTelegramToken(
  userId: string,
  token: string
): Promise<void> {
  await updateContainerEnvVars(userId, { TELEGRAM_BOT_TOKEN: token });
  await prisma.flyMachine.update({
    where: { userId },
    data: { hasTelegramToken: true },
  });
}

export async function restartBot(userId: string): Promise<void> {
  const flyMachine = await prisma.flyMachine.findUnique({
    where: { userId },
  });

  if (!flyMachine || flyMachine.machineId === "pending") {
    throw new Error("No active Fly machine found for user");
  }

  // Update machine config to trigger restart + soul regeneration
  await updateMachineEnv(flyMachine.machineId, { OVERWRITE_SOUL: "true" });

  await prisma.flyMachine.update({
    where: { userId },
    data: { status: "deploying" },
  });
}
