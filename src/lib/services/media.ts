import { prisma } from "@/lib/db/prisma";
import type { MediaUploadInput } from "@/lib/schemas/media";

export async function saveMediaUpload({
  userId,
  data,
}: {
  userId: string;
  data: MediaUploadInput;
}) {
  return prisma.media.create({
    data: {
      userId,
      cloudinaryId: data.cloudinaryId,
      url: data.url,
      resourceType: data.resourceType,
      format: data.format,
      bytes: data.bytes,
      width: data.width,
      height: data.height,
    },
  });
}

export async function getUserMedia(userId: string) {
  return prisma.media.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}
