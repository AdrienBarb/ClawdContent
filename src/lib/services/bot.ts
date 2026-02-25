import { prisma } from "@/lib/db/prisma";
import {
  getDeployments,
  triggerDeploy,
} from "@/lib/railway/mutations";
import { updateContainerEnvVars } from "./provisioning";

export async function getBotStatus(userId: string) {
  const railwayService = await prisma.railwayService.findUnique({
    where: { userId },
    include: { railwayProject: true },
  });

  if (!railwayService) return null;

  // Try to get latest deployment status from Railway
  if (
    railwayService.serviceId !== "pending" &&
    railwayService.status !== "failed"
  ) {
    try {
      const deployments = await getDeployments({
        serviceId: railwayService.serviceId,
        environmentId: railwayService.environmentId,
        projectId: railwayService.railwayProject?.railwayProjectId,
        limit: 1,
      });

      const latestStatus = deployments[0]?.status;
      if (latestStatus) {
        const mappedStatus = mapRailwayStatus(latestStatus);
        if (mappedStatus !== railwayService.status) {
          await prisma.railwayService.update({
            where: { userId },
            data: { status: mappedStatus },
          });
          return { ...railwayService, status: mappedStatus };
        }
      }
    } catch {
      // If we can't reach Railway, return cached status
    }
  }

  return railwayService;
}

function mapRailwayStatus(railwayStatus: string): string {
  switch (railwayStatus) {
    case "SUCCESS":
      return "running";
    case "BUILDING":
    case "DEPLOYING":
    case "INITIALIZING":
    case "WAITING":
      return "deploying";
    case "FAILED":
    case "CRASHED":
      return "failed";
    case "REMOVED":
    case "SLEEPING":
      return "stopped";
    default:
      return "running";
  }
}

export async function setTelegramToken(
  userId: string,
  token: string
): Promise<void> {
  await updateContainerEnvVars(userId, { TELEGRAM_BOT_TOKEN: token });
  await prisma.railwayService.update({
    where: { userId },
    data: { hasTelegramToken: true },
  });
}

export async function restartBot(userId: string): Promise<void> {
  const railwayService = await prisma.railwayService.findUnique({
    where: { userId },
    include: { railwayProject: true },
  });

  if (!railwayService || railwayService.serviceId === "pending") {
    throw new Error("No active Railway service found for user");
  }

  await triggerDeploy({
    serviceId: railwayService.serviceId,
    environmentId: railwayService.environmentId,
    projectId: railwayService.railwayProject?.railwayProjectId,
  });

  await prisma.railwayService.update({
    where: { userId },
    data: { status: "deploying" },
  });
}
