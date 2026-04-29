import "server-only";
import { prisma } from "@/lib/db/prisma";
import { createPost, validatePost } from "@/lib/late/mutations";
import { FREE_POST_LIMIT } from "@/lib/constants/plans";
import { coerceMediaItems } from "@/lib/schemas/mediaItems";
import { validateMediaItems } from "@/lib/services/mediaValidation";

const STALE_LOCK_MS = 5 * 60 * 1000;

export type PublishAction = "publish" | "schedule";

export type PublishResult =
  | {
      ok: true;
      postId: string;
      action: "published" | "scheduled";
      partial?: false;
    }
  | {
      ok: true;
      postId: string;
      action: "published" | "scheduled";
      partial: true;
    }
  | { ok: false; error: "not_found" }
  | { ok: false; error: "already_publishing" }
  | { ok: false; error: "free_post_limit_reached" }
  | { ok: false; error: "no_schedule_staged" }
  | { ok: false; error: "schedule_in_past" }
  | { ok: false; error: "media_validation_failed"; message: string }
  | {
      ok: false;
      error: "validation_failed";
      validationErrors: { platform: string; error: string }[];
    }
  | { ok: false; error: "publish_failed"; message: string };

async function finalizeAfterZernio(
  suggestionId: string,
  userId: string,
  externalPostId: string
): Promise<{ ok: true } | { ok: false }> {
  await prisma.postSuggestion.update({
    where: { id: suggestionId },
    data: { publishedExternalId: externalPostId },
  });

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

/**
 * Single-suggestion publish or schedule. Owns idempotency, soft-lock, paywall,
 * media + content validation, the Zernio call, and atomic cleanup. Both the
 * route handler and the chat tools call this. Never throws on expected
 * failures — always returns a structured result.
 */
export async function publishOrScheduleSuggestion(args: {
  userId: string;
  suggestionId: string;
  action: PublishAction;
}): Promise<PublishResult> {
  const { userId, suggestionId, action } = args;

  const suggestion = await prisma.postSuggestion.findFirst({
    where: { id: suggestionId, socialAccount: { lateProfile: { userId } } },
    include: { socialAccount: { include: { lateProfile: true } } },
  });
  if (!suggestion) return { ok: false, error: "not_found" };

  // Idempotency short-circuit: a previous attempt already created the post on
  // Zernio but cleanup didn't commit. Skip Zernio, just clean up.
  if (suggestion.publishedExternalId) {
    const result = await finalizeAfterZernio(
      suggestionId,
      userId,
      suggestion.publishedExternalId
    );
    return {
      ok: true,
      postId: suggestion.publishedExternalId,
      action: action === "publish" ? "published" : "scheduled",
      partial: !result.ok,
    };
  }

  // Soft lock against double-click.
  const claim = await prisma.postSuggestion.updateMany({
    where: {
      id: suggestionId,
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
  if (claim.count === 0) return { ok: false, error: "already_publishing" };

  const [user, subscription] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { timezone: true, postsPublished: true },
    }),
    prisma.subscription.findUnique({
      where: { userId },
      select: { status: true },
    }),
  ]);
  const hasSubscription =
    subscription?.status === "active" || subscription?.status === "trialing";
  if (!hasSubscription && user.postsPublished >= FREE_POST_LIMIT) {
    return { ok: false, error: "free_post_limit_reached" };
  }

  const { socialAccount } = suggestion;
  const { lateProfile } = socialAccount;
  const userTz = user.timezone ?? "UTC";

  const mediaItems = coerceMediaItems(suggestion.mediaItems);

  const localValidation = validateMediaItems(mediaItems, socialAccount.platform);
  if (!localValidation.ok) {
    return {
      ok: false,
      error: "media_validation_failed",
      message: localValidation.error,
    };
  }

  const validation = await validatePost(
    suggestion.content,
    socialAccount.platform,
    mediaItems.length > 0 ? mediaItems : undefined,
    lateProfile.lateApiKey
  );
  if (!validation.valid) {
    return {
      ok: false,
      error: "validation_failed",
      validationErrors: validation.errors,
    };
  }

  const mediaForCreate = mediaItems.length > 0 ? mediaItems : undefined;

  if (action === "publish") {
    try {
      const post = await createPost(
        lateProfile.lateProfileId,
        {
          content: suggestion.content,
          platform: {
            platform: socialAccount.platform,
            accountId: socialAccount.lateAccountId,
          },
          publishNow: true,
          timezone: userTz,
          ...(mediaForCreate ? { mediaItems: mediaForCreate } : {}),
        },
        lateProfile.lateApiKey
      );
      const result = await finalizeAfterZernio(suggestionId, userId, post.id);
      return {
        ok: true,
        postId: post.id,
        action: "published",
        partial: !result.ok,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, error: "publish_failed", message };
    }
  }

  // schedule
  if (!suggestion.scheduledAt) return { ok: false, error: "no_schedule_staged" };
  if (suggestion.scheduledAt.getTime() <= Date.now()) {
    return { ok: false, error: "schedule_in_past" };
  }

  try {
    const post = await createPost(
      lateProfile.lateProfileId,
      {
        content: suggestion.content,
        platform: {
          platform: socialAccount.platform,
          accountId: socialAccount.lateAccountId,
        },
        scheduledAt: suggestion.scheduledAt.toISOString(),
        publishNow: false,
        timezone: userTz,
        ...(mediaForCreate ? { mediaItems: mediaForCreate } : {}),
      },
      lateProfile.lateApiKey
    );
    const result = await finalizeAfterZernio(suggestionId, userId, post.id);
    return {
      ok: true,
      postId: post.id,
      action: "scheduled",
      partial: !result.ok,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: "publish_failed", message };
  }
}
