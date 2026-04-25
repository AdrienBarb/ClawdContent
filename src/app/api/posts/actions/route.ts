import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import {
  getPost,
  deletePost,
  updatePost,
  createPost,
  retryPost,
  unpublishPost,
  resolveAccountId,
  validatePost,
} from "@/lib/late/mutations";

// POST /api/posts/actions — Perform actions on Zernio posts
// Body: { postId, action: "publish" | "move-to-draft" | "delete" | "unpublish" | "retry" }
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: errorMessages.UNAUTHORIZED }, { status: 401 });
    }

    const body = await req.json();
    const { postId, action } = body;

    if (!postId || !action) {
      return NextResponse.json({ error: "postId and action are required" }, { status: 400 });
    }

    const lateProfile = await prisma.lateProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!lateProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const apiKey = lateProfile.lateApiKey;

    switch (action) {
      case "publish": {
        // Delete scheduled/draft post and create a new one with publishNow
        const post = await getPost(postId, apiKey);
        const platform = post.platforms[0];
        if (!platform) {
          return NextResponse.json({ error: "No platform found on post" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { timezone: true },
        });

        // Validate with Zernio before publishing
        const validation = await validatePost(
          post.content,
          platform.platform,
          post.mediaItems.length > 0 ? post.mediaItems : undefined,
          apiKey
        );
        if (!validation.valid) {
          return NextResponse.json(
            { error: "VALIDATION_FAILED", validationErrors: validation.errors },
            { status: 422 }
          );
        }

        await deletePost(postId, apiKey);
        const newPost = await createPost(
          lateProfile.lateProfileId,
          {
            content: post.content,
            platform: { platform: platform.platform, accountId: resolveAccountId(platform.accountId) },
            publishNow: true,
            timezone: user?.timezone ?? "UTC",
            ...(post.mediaItems.length > 0 ? { mediaItems: post.mediaItems } : {}),
          },
          apiKey
        );
        return NextResponse.json({ success: true, postId: newPost.id, action: "published" });
      }

      case "move-to-draft": {
        // Delete scheduled post and recreate as draft (Zernio doesn't support clearing scheduledFor via PUT)
        const post = await getPost(postId, apiKey);
        const platform = post.platforms[0];
        if (!platform) {
          return NextResponse.json({ error: "No platform found on post" }, { status: 400 });
        }

        await deletePost(postId, apiKey);
        const draftPost = await createPost(
          lateProfile.lateProfileId,
          {
            content: post.content,
            platform: { platform: platform.platform, accountId: resolveAccountId(platform.accountId) },
            publishNow: false,
            ...(post.mediaItems.length > 0 ? { mediaItems: post.mediaItems } : {}),
          },
          apiKey
        );
        return NextResponse.json({ success: true, postId: draftPost.id, action: "moved-to-draft" });
      }

      case "delete": {
        // Only draft/scheduled/failed posts can be deleted — published posts must use unpublish
        await deletePost(postId, apiKey);
        return NextResponse.json({ success: true, action: "deleted" });
      }

      case "unpublish": {
        const post = await getPost(postId, apiKey);
        const platform = post.platforms[0];
        if (!platform) {
          return NextResponse.json({ error: "No platform found on post" }, { status: 400 });
        }
        await unpublishPost(postId, platform.platform, apiKey);
        return NextResponse.json({ success: true, action: "unpublished" });
      }

      case "retry": {
        await retryPost(postId, apiKey);
        return NextResponse.json({ success: true, action: "retried" });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    return errorHandler(error);
  }
}
