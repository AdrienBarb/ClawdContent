import { prisma } from "@/lib/db/prisma";
import {
  getDeployments,
  cancelDeployment,
  cancelActiveDeployments,
  setServiceVariables,
} from "@/lib/railway/mutations";
import { updateContainerEnvVars } from "./provisioning";

const STUCK_DEPLOY_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes

const DEPLOYING_STATUSES = new Set([
  "BUILDING",
  "DEPLOYING",
  "INITIALIZING",
  "WAITING",
]);

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
        limit: 5,
      });

      const latest = deployments[0];
      if (!latest) return railwayService;

      // Auto-recover: if latest deployment is stuck deploying for too long,
      // cancel it and fall back to the last successful deployment
      if (DEPLOYING_STATUSES.has(latest.status)) {
        const age = Date.now() - new Date(latest.createdAt).getTime();
        if (age > STUCK_DEPLOY_THRESHOLD_MS) {
          console.log(
            `Auto-cancelling stuck deployment ${latest.id} for user ${userId} (age: ${Math.round(age / 1000)}s)`
          );
          cancelDeployment(latest.id).catch((err) =>
            console.error("Failed to auto-cancel stuck deployment:", err)
          );

          // Find the last successful deployment to report its status
          const lastSuccess = deployments.find(
            (d) => d.status === "SUCCESS"
          );
          const fallbackStatus = lastSuccess
            ? "running"
            : mapRailwayStatus(latest.status);

          if (fallbackStatus !== railwayService.status) {
            await prisma.railwayService.update({
              where: { userId },
              data: { status: fallbackStatus },
            });
            return { ...railwayService, status: fallbackStatus };
          }
          return railwayService;
        }
      }

      const mappedStatus = mapRailwayStatus(latest.status);
      if (mappedStatus !== railwayService.status) {
        await prisma.railwayService.update({
          where: { userId },
          data: { status: mappedStatus },
        });
        return { ...railwayService, status: mappedStatus };
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

  // Cancel any stuck/in-progress deployments before triggering a fresh one
  await cancelActiveDeployments({
    serviceId: railwayService.serviceId,
    environmentId: railwayService.environmentId,
    projectId: railwayService.railwayProject?.railwayProjectId,
  }).catch((err) =>
    console.error("Failed to cancel active deployments:", err)
  );

  // Use setServiceVariables to trigger a deploy — environmentTriggersDeploy
  // does NOT work for Docker image services.
  await setServiceVariables({
    serviceId: railwayService.serviceId,
    environmentId: railwayService.environmentId,
    projectId: railwayService.railwayProject?.railwayProjectId,
    variables: { OVERWRITE_SOUL: "true" },
  });

  await prisma.railwayService.update({
    where: { userId },
    data: { status: "deploying" },
  });
}
