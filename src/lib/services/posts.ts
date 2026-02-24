import { prisma } from "@/lib/db/prisma";
import {
  listPosts as lateListPosts,
  deletePost as lateDeletePost,
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
