import { prisma } from "@/lib/db/prisma";
import {
  createProject as railwayCreateProject,
  createVolume,
  getProductionEnvironmentId,
} from "@/lib/railway/mutations";

const VOLUME_MOUNT_PATH = "/home/node/.openclaw/";
const MAX_VOLUMES_PER_PROJECT = 18;

export async function seedDefaultProject(): Promise<void> {
  const count = await prisma.railwayProject.count();
  if (count > 0) return;

  const railwayProjectId = process.env.RAILWAY_DEFAULT_PROJECT_ID;
  if (!railwayProjectId) {
    throw new Error("Missing RAILWAY_DEFAULT_PROJECT_ID environment variable");
  }

  const environmentId =
    await getProductionEnvironmentId(railwayProjectId);

  // Use upsert to handle concurrent provisioning safely
  await prisma.railwayProject.upsert({
    where: { railwayProjectId },
    update: {},
    create: {
      railwayProjectId,
      name: "postclaw-default",
      environmentId,
    },
  });
}

export async function allocateProject(): Promise<{
  id: string;
  railwayProjectId: string;
  environmentId: string;
}> {
  const available = await prisma.railwayProject.findFirst({
    where: { volumeCount: { lt: MAX_VOLUMES_PER_PROJECT } },
    orderBy: { createdAt: "asc" },
  });

  if (available) {
    return {
      id: available.id,
      railwayProjectId: available.railwayProjectId,
      environmentId: available.environmentId,
    };
  }

  // All projects full — create a new one
  const projectNumber = await prisma.railwayProject.count();
  const newProject = await railwayCreateProject(
    `postclaw-${projectNumber + 1}`
  );

  const dbProject = await prisma.railwayProject.create({
    data: {
      railwayProjectId: newProject.id,
      name: newProject.name,
      environmentId: newProject.environmentId,
    },
  });

  return {
    id: dbProject.id,
    railwayProjectId: dbProject.railwayProjectId,
    environmentId: dbProject.environmentId,
  };
}

export async function createServiceVolume({
  projectId,
  railwayProjectId,
  serviceId,
  environmentId,
}: {
  projectId: string;
  railwayProjectId: string;
  serviceId: string;
  environmentId: string;
}): Promise<string> {
  const volume = await createVolume({
    projectId: railwayProjectId,
    serviceId,
    environmentId,
    mountPath: VOLUME_MOUNT_PATH,
  });

  await prisma.railwayProject.update({
    where: { id: projectId },
    data: { volumeCount: { increment: 1 } },
  });

  return volume.id;
}

export async function releaseProjectVolume(
  projectId: string
): Promise<void> {
  await prisma.railwayProject.update({
    where: { id: projectId },
    data: { volumeCount: { decrement: 1 } },
  });
}
