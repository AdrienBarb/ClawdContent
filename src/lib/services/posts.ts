import { prisma } from "@/lib/db/prisma";
import {
  listPosts as lateListPosts,
  deletePost as lateDeletePost,
  retryPost as lateRetryPost,
  unpublishPost as lateUnpublishPost,
  updatePost as lateUpdatePost,
  LatePost,
} from "@/lib/late/mutations";

export async function getUserPosts(
  userId: string,
  options?: { status?: string; limit?: number }
): Promise<LatePost[]> {
  const lateProfile = await prisma.lateProfile.findUnique({
    where: { userId },
  });

  if (!lateProfile) {
    return [];
  }

  return lateListPosts(
    lateProfile.lateProfileId,
    lateProfile.lateApiKey,
    options
  );
}

export async function deleteUserPost(
  userId: string,
  postId: string
): Promise<void> {
  const lateProfile = await prisma.lateProfile.findUnique({
    where: { userId },
  });

  if (!lateProfile) {
    throw new Error("Late profile not found. Please wait for provisioning to complete.");
  }

  await lateDeletePost(postId, lateProfile.lateApiKey);
}

export async function retryUserPost(
  userId: string,
  postId: string
): Promise<void> {
  const lateProfile = await prisma.lateProfile.findUnique({
    where: { userId },
  });

  if (!lateProfile) {
    throw new Error("Late profile not found. Please wait for provisioning to complete.");
  }

  await lateRetryPost(postId, lateProfile.lateApiKey);
}

export async function unpublishUserPost(
  userId: string,
  postId: string,
  platform: string
): Promise<void> {
  const lateProfile = await prisma.lateProfile.findUnique({
    where: { userId },
  });

  if (!lateProfile) {
    throw new Error("Late profile not found. Please wait for provisioning to complete.");
  }

  await lateUnpublishPost(postId, platform, lateProfile.lateApiKey);
}

export async function updateUserPost(
  userId: string,
  postId: string,
  data: { content?: string; scheduledAt?: string }
): Promise<void> {
  const lateProfile = await prisma.lateProfile.findUnique({
    where: { userId },
  });

  if (!lateProfile) {
    throw new Error("Late profile not found. Please wait for provisioning to complete.");
  }

  await lateUpdatePost(postId, data, lateProfile.lateApiKey);
}
