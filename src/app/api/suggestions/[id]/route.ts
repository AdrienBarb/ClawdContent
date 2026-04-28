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
  })
  .strict();

const postActionSchema = z
  .object({
    action: z.enum(["schedule", "publish"]).optional(),
    scheduledAt: z.string().datetime().optional(),
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

function computeScheduledDate(
  suggestedDay: number,
  suggestedHour: number,
  userTz: string
): Date {
  const now = new Date();
  const nowParts = new Intl.DateTimeFormat("en-US", {
    timeZone: userTz,
    weekday: "short",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(now);
  const userDayName = nowParts.find((p) => p.type === "weekday")?.value ?? "";
  const userHour = parseInt(nowParts.find((p) => p.type === "hour")?.value ?? "0");

  const jsMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const userJsDay = jsMap[userDayName] ?? 0;
  const targetJsDow = suggestedDay === 6 ? 0 : suggestedDay + 1;

  let daysUntil = targetJsDow - userJsDay;
  if (daysUntil < 0) daysUntil += 7;
  if (daysUntil === 0 && suggestedHour <= userHour) daysUntil = 7;

  const scheduledDate = new Date(now);
  scheduledDate.setUTCDate(scheduledDate.getUTCDate() + daysUntil);
  scheduledDate.setUTCHours(suggestedHour, 0, 0, 0);

  const checkParts = new Intl.DateTimeFormat("en-US", {
    timeZone: userTz,
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(scheduledDate);
  const checkHour = parseInt(checkParts.find((p) => p.type === "hour")?.value ?? "0");
  scheduledDate.setUTCHours(scheduledDate.getUTCHours() - (checkHour - suggestedHour));

  return scheduledDate;
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

    const data: Record<string, unknown> = {};
    if (input.content !== undefined) data.content = input.content;
    if (input.mediaItems !== undefined) data.mediaItems = input.mediaItems;
    if (input.suggestedDay !== undefined) data.suggestedDay = input.suggestedDay;
    if (input.suggestedHour !== undefined) data.suggestedHour = input.suggestedHour;

    const updated = await prisma.postSuggestion.update({ where: { id }, data });
    return NextResponse.json({
      suggestion: { ...updated, mediaItems: coerceMediaItems(updated.mediaItems) },
    });
  } catch (error) {
    return errorHandler(error);
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
    const input = postActionSchema.parse(raw);
    const action = input.action ?? "schedule";

    const suggestion = await findSuggestion(id, session.user.id);
    if (!suggestion) return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });

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
      await Promise.all([
        prisma.postSuggestion.delete({ where: { id } }),
        prisma.user.update({
          where: { id: session.user.id },
          data: { postsPublished: { increment: 1 } },
        }),
      ]);
      return NextResponse.json({ success: true, postId: post.id, action: "published" });
    }

    const scheduledDate = input.scheduledAt
      ? new Date(input.scheduledAt)
      : computeScheduledDate(suggestion.suggestedDay, suggestion.suggestedHour, userTz);
    const post = await createPost(
      lateProfile.lateProfileId,
      {
        content: suggestion.content,
        platform: { platform: socialAccount.platform, accountId: socialAccount.lateAccountId },
        scheduledAt: scheduledDate.toISOString(),
        publishNow: false,
        timezone: userTz,
        ...(mediaForCreate ? { mediaItems: mediaForCreate } : {}),
      },
      lateProfile.lateApiKey
    );
    await Promise.all([
      prisma.postSuggestion.delete({ where: { id } }),
      prisma.user.update({
        where: { id: session.user.id },
        data: { postsPublished: { increment: 1 } },
      }),
    ]);
    return NextResponse.json({ success: true, postId: post.id, action: "scheduled" });
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
