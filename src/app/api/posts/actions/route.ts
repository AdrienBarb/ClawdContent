import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import {
  getPost,
  deletePost,
  createPost,
  retryPost,
  unpublishPost,
  resolveAccountId,
  validatePost,
  type LatePostDetail,
} from "@/lib/late/mutations";

// Zernio post IDs are MongoDB ObjectIds (24 hex chars). Be permissive for
// future formats but reject any character that could traverse a URL path.
const postIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/, "Invalid post id");

const bodySchema = z.object({
  postId: postIdSchema,
  action: z.enum(["publish", "move-to-draft", "delete", "unpublish", "retry"]),
});

/**
 * Defense-in-depth ownership check. The per-user Zernio API key is already
 * profile-scoped on Zernio's side, but a single missed scope on their end
 * would mean any authed user could mutate any other user's post. We also
 * verify that every platform on the returned post belongs to a SocialAccount
 * the current user actually owns.
 */
async function assertPostOwnedByUser(
  post: LatePostDetail,
  ownedAccountIds: Set<string>
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (!post.platforms || post.platforms.length === 0) {
    return { ok: false, status: 400, error: "No platform found on post" };
  }
  for (const platform of post.platforms) {
    const accountId = resolveAccountId(platform.accountId);
    if (!accountId || !ownedAccountIds.has(accountId)) {
      return { ok: false, status: 404, error: "Not found" };
    }
  }
  return { ok: true };
}

// POST /api/posts/actions — Perform actions on Zernio posts
// Body: { postId, action: "publish" | "move-to-draft" | "delete" | "unpublish" | "retry" }
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json(
        { error: errorMessages.UNAUTHORIZED },
        { status: 401 }
      );
    }

    const { postId, action } = bodySchema.parse(await req.json());

    const lateProfile = await prisma.lateProfile.findUnique({
      where: { userId: session.user.id },
      include: { socialAccounts: { select: { lateAccountId: true } } },
    });

    if (!lateProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const apiKey = lateProfile.lateApiKey;
    const ownedAccountIds = new Set(
      lateProfile.socialAccounts.map((a) => a.lateAccountId)
    );

    // For every action, we first load the post (server-side verification that
    // the post exists under our profile-scoped key), then check it actually
    // targets accounts the user owns. `retry` is the only action that doesn't
    // need post detail for its execute step, but we still load + verify.
    const post = await getPost(postId, apiKey);
    const ownership = await assertPostOwnedByUser(post, ownedAccountIds);
    if (!ownership.ok) {
      return NextResponse.json(
        { error: ownership.error },
        { status: ownership.status }
      );
    }

    switch (action) {
      case "publish": {
        // Delete scheduled/draft post and create a new one with publishNow
        const platform = post.platforms[0];
        if (!platform) {
          return NextResponse.json(
            { error: "No platform found on post" },
            { status: 400 }
          );
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
            {
              error: "VALIDATION_FAILED",
              validationErrors: validation.errors,
            },
            { status: 422 }
          );
        }

        await deletePost(postId, apiKey);
        const newPost = await createPost(
          lateProfile.lateProfileId,
          {
            content: post.content,
            platform: {
              platform: platform.platform,
              accountId: resolveAccountId(platform.accountId),
            },
            publishNow: true,
            timezone: user?.timezone ?? "UTC",
            ...(post.mediaItems.length > 0
              ? { mediaItems: post.mediaItems }
              : {}),
          },
          apiKey
        );
        return NextResponse.json({
          success: true,
          postId: newPost.id,
          action: "published",
        });
      }

      case "move-to-draft": {
        // Delete scheduled post and recreate as draft (Zernio doesn't support clearing scheduledFor via PUT)
        const platform = post.platforms[0];
        if (!platform) {
          return NextResponse.json(
            { error: "No platform found on post" },
            { status: 400 }
          );
        }

        await deletePost(postId, apiKey);
        const draftPost = await createPost(
          lateProfile.lateProfileId,
          {
            content: post.content,
            platform: {
              platform: platform.platform,
              accountId: resolveAccountId(platform.accountId),
            },
            publishNow: false,
            ...(post.mediaItems.length > 0
              ? { mediaItems: post.mediaItems }
              : {}),
          },
          apiKey
        );
        return NextResponse.json({
          success: true,
          postId: draftPost.id,
          action: "moved-to-draft",
        });
      }

      case "delete": {
        await deletePost(postId, apiKey);
        return NextResponse.json({ success: true, action: "deleted" });
      }

      case "unpublish": {
        const platform = post.platforms[0];
        if (!platform) {
          return NextResponse.json(
            { error: "No platform found on post" },
            { status: 400 }
          );
        }
        await unpublishPost(postId, platform.platform, apiKey);
        return NextResponse.json({ success: true, action: "unpublished" });
      }

      case "retry": {
        await retryPost(postId, apiKey);
        return NextResponse.json({ success: true, action: "retried" });
      }
    }
  } catch (error) {
    return errorHandler(error);
  }
}
