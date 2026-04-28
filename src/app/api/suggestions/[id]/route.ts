import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { createPost, validatePost } from "@/lib/late/mutations";
import { FREE_POST_LIMIT } from "@/lib/constants/plans";
import { coerceMediaItems, mediaItemsSchema } from "@/lib/schemas/mediaItems";
import { validateMediaItems } from "@/lib/services/mediaValidation";

const patchInputSchema = z
  .object({
    content: z.string().trim().min(1).max(10000).optional(),
    mediaItems: mediaItemsSchema.optional(),
    suggestedDay: z.number().int().min(0).max(6).optional(),
    suggestedHour: z.number().int().min(0).max(23).optional(),
    scheduledAt: z.union([z.string().datetime(), z.null()]).optional(),
  })
  .strict();

const postActionSchema = z
  .object({
    action: z.enum(["schedule", "publish"]),
  })
  .strict();

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  return session;
}

async function findSuggestion(id: string, userId: string) {
  return prisma.postSuggestion.findFirst({
    where: { id, socialAccount: { lateProfile: { userId } } },
    include: { socialAccount: { include: { lateProfile: true } } },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: errorMessages.UNAUTHORIZED }, { status: 401 });

    const { id } = await params;
    const raw = await req.json().catch(() => ({}));
    const input = patchInputSchema.parse(raw);

    const existing = await prisma.postSuggestion.findFirst({
      where: { id, socialAccount: { lateProfile: { userId: session.user.id } } },
      include: { socialAccount: { select: { platform: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });
    }

    if (input.mediaItems !== undefined) {
      const result = validateMediaItems(input.mediaItems, existing.socialAccount.platform);
      if (!result.ok) {
        return NextResponse.json(
          { error: "MEDIA_VALIDATION_FAILED", message: result.error },
          { status: 422 }
        );
      }
    }

    if (typeof input.scheduledAt === "string") {
      const parsed = new Date(input.scheduledAt);
      if (parsed.getTime() <= Date.now()) {
        return NextResponse.json(
          {
            error: "INVALID_SCHEDULE",
            message: "Schedule time must be in the future.",
          },
          { status: 400 }
        );
      }
      const oneYearMs = 365 * 24 * 60 * 60 * 1000;
      if (parsed.getTime() > Date.now() + oneYearMs) {
        return NextResponse.json(
          {
            error: "INVALID_SCHEDULE",
            message: "Schedule time can't be more than a year out.",
          },
          { status: 400 }
        );
      }
    }

    const data: Record<string, unknown> = {};
    if (input.content !== undefined) data.content = input.content;
    if (input.mediaItems !== undefined) data.mediaItems = input.mediaItems;
    if (input.suggestedDay !== undefined) data.suggestedDay = input.suggestedDay;
    if (input.suggestedHour !== undefined) data.suggestedHour = input.suggestedHour;
    if (input.scheduledAt !== undefined) {
      data.scheduledAt =
        input.scheduledAt === null ? null : new Date(input.scheduledAt);
    }

    const updated = await prisma.postSuggestion.update({ where: { id }, data });
    return NextResponse.json({
      suggestion: { ...updated, mediaItems: coerceMediaItems(updated.mediaItems) },
    });
  } catch (error) {
    return errorHandler(error);
  }
}

// If a publish attempt's cleanup transaction failed but Zernio already
// accepted the post, the next click would re-fire Zernio and double-post.
// We stamp `publishedExternalId` between Zernio call and cleanup so a retry
// can detect "already sent" and just clean up locally without re-calling
// Zernio. STALE_LOCK_MS lets retries through if the soft lock from a
// previous attempt is older than this window (covers crashed responses).
const STALE_LOCK_MS = 5 * 60 * 1000;

async function finalizeAfterZernio(
  suggestionId: string,
  userId: string,
  externalPostId: string
): Promise<{ ok: true } | { ok: false }> {
  // 1. Checkpoint: single atomic write so a retry can detect "already sent".
  await prisma.postSuggestion.update({
    where: { id: suggestionId },
    data: { publishedExternalId: externalPostId },
  });

  // 2. Atomic cleanup: increment counter + delete the draft together so
  // the counter never disagrees with the suggestion list.
  try {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { postsPublished: { increment: 1 } },
      }),
      prisma.postSuggestion.delete({ where: { id: suggestionId } }),
    ]);
    return { ok: true };
  } catch (txError) {
    console.error(
      `[publish] cleanup tx failed for suggestion=${suggestionId} externalPostId=${externalPostId} user=${userId}`,
      txError
    );
    return { ok: false };
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: errorMessages.UNAUTHORIZED }, { status: 401 });

    const { id } = await params;
    const raw = await req.json().catch(() => ({}));
    const { action } = postActionSchema.parse(raw);

    const suggestion = await findSuggestion(id, session.user.id);
    if (!suggestion) return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });

    // ── Idempotency short-circuit ─────────────────────────────────────────
    // A previous attempt already created the post on Zernio but its DB
    // cleanup didn't commit. Don't call Zernio again — just finish the
    // cleanup locally and report success with the existing post id.
    if (suggestion.publishedExternalId) {
      const result = await finalizeAfterZernio(
        id,
        session.user.id,
        suggestion.publishedExternalId
      );
      if (!result.ok) {
        return NextResponse.json(
          {
            error: "PUBLISH_PARTIAL",
            postId: suggestion.publishedExternalId,
            message: "Post published — refresh to clear it from your drafts.",
          },
          { status: 500 }
        );
      }
      return NextResponse.json({
        success: true,
        postId: suggestion.publishedExternalId,
        action: action === "publish" ? "published" : "scheduled",
      });
    }

    // ── Soft lock against double-click ────────────────────────────────────
    // updateMany returns count of rows it actually wrote. If it's 0, the
    // suggestion is being published right now in another request.
    const claim = await prisma.postSuggestion.updateMany({
      where: {
        id,
        publishedExternalId: null,
        OR: [
          { publishingStartedAt: null },
          {
            publishingStartedAt: {
              lt: new Date(Date.now() - STALE_LOCK_MS),
            },
          },
        ],
      },
      data: { publishingStartedAt: new Date() },
    });
    if (claim.count === 0) {
      return NextResponse.json(
        {
          error: "ALREADY_PUBLISHING",
          message:
            "This post is already being published — give it a few seconds.",
        },
        { status: 409 }
      );
    }

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
    const hasSubscription =
      subscription?.status === "active" || subscription?.status === "trialing";
    if (!hasSubscription && user.postsPublished >= FREE_POST_LIMIT) {
      return NextResponse.json({ error: "FREE_POST_LIMIT_REACHED" }, { status: 403 });
    }

    const { socialAccount } = suggestion;
    const { lateProfile } = socialAccount;
    const userTz = user.timezone ?? "UTC";

    const mediaItems = coerceMediaItems(suggestion.mediaItems);

    const localValidation = validateMediaItems(mediaItems, socialAccount.platform);
    if (!localValidation.ok) {
      return NextResponse.json(
        { error: "MEDIA_VALIDATION_FAILED", message: localValidation.error },
        { status: 422 }
      );
    }

    const validation = await validatePost(
      suggestion.content,
      socialAccount.platform,
      mediaItems.length > 0 ? mediaItems : undefined,
      lateProfile.lateApiKey
    );
    if (!validation.valid) {
      return NextResponse.json(
        { error: "VALIDATION_FAILED", validationErrors: validation.errors },
        { status: 422 }
      );
    }

    const mediaForCreate = mediaItems.length > 0 ? mediaItems : undefined;

    if (action === "publish") {
      const post = await createPost(
        lateProfile.lateProfileId,
        {
          content: suggestion.content,
          platform: { platform: socialAccount.platform, accountId: socialAccount.lateAccountId },
          publishNow: true,
          timezone: userTz,
          ...(mediaForCreate ? { mediaItems: mediaForCreate } : {}),
        },
        lateProfile.lateApiKey
      );
      const result = await finalizeAfterZernio(id, session.user.id, post.id);
      if (!result.ok) {
        return NextResponse.json(
          {
            error: "PUBLISH_PARTIAL",
            postId: post.id,
            message: "Post published — refresh to clear it from your drafts.",
          },
          { status: 500 }
        );
      }
      return NextResponse.json({
        success: true,
        postId: post.id,
        action: "published",
      });
    }

    if (!suggestion.scheduledAt) {
      return NextResponse.json(
        {
          error: "NO_SCHEDULE_STAGED",
          message: "Pick a schedule time first.",
        },
        { status: 422 }
      );
    }
    if (suggestion.scheduledAt.getTime() <= Date.now()) {
      return NextResponse.json(
        {
          error: "SCHEDULE_IN_PAST",
          message: "That schedule time has passed. Pick a new one.",
        },
        { status: 422 }
      );
    }

    const post = await createPost(
      lateProfile.lateProfileId,
      {
        content: suggestion.content,
        platform: { platform: socialAccount.platform, accountId: socialAccount.lateAccountId },
        scheduledAt: suggestion.scheduledAt.toISOString(),
        publishNow: false,
        timezone: userTz,
        ...(mediaForCreate ? { mediaItems: mediaForCreate } : {}),
      },
      lateProfile.lateApiKey
    );
    const result = await finalizeAfterZernio(id, session.user.id, post.id);
    if (!result.ok) {
      return NextResponse.json(
        {
          error: "PUBLISH_PARTIAL",
          postId: post.id,
          message: "Post scheduled — refresh to clear it from your drafts.",
        },
        { status: 500 }
      );
    }
    return NextResponse.json({
      success: true,
      postId: post.id,
      action: "scheduled",
    });
  } catch (error) {
    return errorHandler(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: errorMessages.UNAUTHORIZED }, { status: 401 });

    const { id } = await params;
    const suggestion = await prisma.postSuggestion.findFirst({
      where: { id, socialAccount: { lateProfile: { userId: session.user.id } } },
    });
    if (!suggestion) return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });

    await prisma.postSuggestion.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorHandler(error);
  }
}
