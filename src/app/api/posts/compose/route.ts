import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { createPost, validatePost } from "@/lib/late/mutations";
import { FREE_POST_LIMIT } from "@/lib/constants/plans";
import { z } from "zod";

const composeSchema = z.object({
  content: z.string().min(1),
  accountId: z.string().min(1),
  action: z.enum(["publish", "schedule"]),
  scheduledAt: z.string().optional(),
  mediaItems: z
    .array(z.object({ url: z.string(), type: z.string() }))
    .optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json(
        { error: errorMessages.UNAUTHORIZED },
        { status: 401 }
      );
    }

    const body = await req.json();
    const data = composeSchema.parse(body);

    // Check free post limit
    const [user, subscription] = await Promise.all([
      prisma.user.findUniqueOrThrow({
        where: { id: session.user.id },
        select: { timezone: true, postsPublished: true },
      }),
      prisma.subscription.findUnique({
        where: { userId: session.user.id },
        select: { status: true },
      }),
    ]);

    const hasSubscription = subscription?.status === "active" || subscription?.status === "trialing";
    if (!hasSubscription && user.postsPublished >= FREE_POST_LIMIT) {
      return NextResponse.json(
        { error: "FREE_POST_LIMIT_REACHED" },
        { status: 403 }
      );
    }

    // Find the social account + profile
    const account = await prisma.socialAccount.findFirst({
      where: {
        id: data.accountId,
        lateProfile: { userId: session.user.id },
        status: "active",
      },
      include: { lateProfile: true },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    // Validate with Zernio before sending
    const validation = await validatePost(
      data.content,
      account.platform,
      data.mediaItems,
      account.lateProfile.lateApiKey
    );
    if (!validation.valid) {
      return NextResponse.json(
        { error: "VALIDATION_FAILED", validationErrors: validation.errors },
        { status: 422 }
      );
    }

    const post = await createPost(
      account.lateProfile.lateProfileId,
      {
        content: data.content,
        platform: {
          platform: account.platform,
          accountId: account.lateAccountId,
        },
        publishNow: data.action === "publish",
        ...(data.action === "schedule" && data.scheduledAt
          ? { scheduledAt: data.scheduledAt }
          : {}),
        timezone: user.timezone ?? "UTC",
        ...(data.mediaItems ? { mediaItems: data.mediaItems } : {}),
      },
      account.lateProfile.lateApiKey
    );

    // Increment counter
    await prisma.user.update({
      where: { id: session.user.id },
      data: { postsPublished: { increment: 1 } },
    });

    return NextResponse.json({
      success: true,
      postId: post.id,
      action: data.action === "publish" ? "published" : "scheduled",
    });
  } catch (error) {
    return errorHandler(error);
  }
}
