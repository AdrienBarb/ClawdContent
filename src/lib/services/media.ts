import { prisma } from "@/lib/db/prisma";
import type { MediaUploadInput } from "@/lib/schemas/media";
import { getPublicUrl, removeObjects } from "@/lib/supabase/storage";

export async function saveMediaUpload({
  userId,
  data,
}: {
  userId: string;
  data: MediaUploadInput;
}) {
  // Trust only the storage path, and only within the caller's own folder.
  // Derive the URL server-side so a client can't persist an arbitrary `url`
  // (or point a row at another user's object).
  if (!data.storagePath.startsWith(`users/${userId}/`)) {
    throw new Error("Invalid storage path");
  }
  return prisma.media.create({
    data: {
      userId,
      storagePath: data.storagePath,
      url: getPublicUrl(data.storagePath),
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

export async function deleteMedia({
  userId,
  mediaId,
}: {
  userId: string;
  mediaId: string;
}) {
  const media = await prisma.media.findFirst({
    where: { id: mediaId, userId },
  });
  if (!media) {
    throw new Error("Media not found");
  }

  await removeObjects([media.storagePath]);
  await prisma.media.delete({ where: { id: mediaId } });
}
