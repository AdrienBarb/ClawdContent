import { prisma } from "@/lib/db/prisma";
import {
  listPosts as lateListPosts,
  getPost as lateGetPost,
  deletePost as lateDeletePost,
  retryPost as lateRetryPost,
  unpublishPost as lateUnpublishPost,
  updatePost as lateUpdatePost,
  LatePostDetail,
  PaginatedPosts,
} from "@/lib/late/mutations";

export async function getUserPosts(
  userId: string,
  options?: { status?: string; limit?: number; page?: number; sortBy?: string; platform?: string }
): Promise<PaginatedPosts> {
  const lateProfile = await prisma.lateProfile.findUnique({
    where: { userId },
  });

  if (!lateProfile) {
    return { posts: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } };
  }

  return lateListPosts(
    lateProfile.lateProfileId,
    lateProfile.lateApiKey,
    options
  );
}

export async function getUserPost(
  userId: string,
  postId: string
): Promise<LatePostDetail> {
  const lateProfile = await prisma.lateProfile.findUnique({
    where: { userId },
  });

  if (!lateProfile) {
    throw new Error("Late profile not found. Please wait for provisioning to complete.");
  }

  return lateGetPost(postId, lateProfile.lateApiKey);
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
  data: { content?: string; scheduledAt?: string | null; mediaItems?: { url: string; type: string }[] }
): Promise<void> {
  const lateProfile = await prisma.lateProfile.findUnique({
    where: { userId },
  });

  if (!lateProfile) {
    throw new Error("Late profile not found. Please wait for provisioning to complete.");
  }

  await lateUpdatePost(postId, data, lateProfile.lateApiKey);
}
