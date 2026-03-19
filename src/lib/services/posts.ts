import { prisma } from "@/lib/db/prisma";
import {
  listPosts as lateListPosts,
  deletePost as lateDeletePost,
  updatePost as lateUpdatePost,
  unpublishPost as lateUnpublishPost,
  ListPostsOptions,
  ListPostsResult,
} from "@/lib/late/mutations";

async function getLateProfile(userId: string) {
  const lateProfile = await prisma.lateProfile.findUnique({
    where: { userId },
  });
  if (!lateProfile) {
    throw new Error(
      "Late profile not found. Please wait for provisioning to complete."
    );
  }
  return lateProfile;
}

export async function getUserPosts(
  userId: string,
  options?: ListPostsOptions
): Promise<ListPostsResult> {
  const lateProfile = await prisma.lateProfile.findUnique({
    where: { userId },
  });

  if (!lateProfile) {
    return {
      posts: [],
      pagination: { page: 1, limit: 10, total: 0, pages: 0 },
    };
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
  const lateProfile = await getLateProfile(userId);
  await lateDeletePost(postId, lateProfile.lateApiKey);
}

export async function rescheduleUserPost(
  userId: string,
  postId: string,
  scheduledFor: string
): Promise<void> {
  const lateProfile = await getLateProfile(userId);
  await lateUpdatePost(postId, lateProfile.lateApiKey, { scheduledFor });
}

export async function unpublishUserPost(
  userId: string,
  postId: string,
  platform: string
): Promise<void> {
  const lateProfile = await getLateProfile(userId);
  await lateUnpublishPost(postId, platform, lateProfile.lateApiKey);
}
