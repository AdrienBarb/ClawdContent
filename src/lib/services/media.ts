import { prisma } from "@/lib/db/prisma";
import type { MediaUploadInput } from "@/lib/schemas/media";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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

  await cloudinary.uploader.destroy(media.cloudinaryId);
  await prisma.media.delete({ where: { id: mediaId } });
}
