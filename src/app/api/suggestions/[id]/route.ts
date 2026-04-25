import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { createPost, validatePost } from "@/lib/late/mutations";
import { FREE_POST_LIMIT } from "@/lib/constants/plans";

// Helper: get user session or return 401
async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  return session;
}

// Helper: find suggestion belonging to user
async function findSuggestion(id: string, userId: string) {
  return prisma.postSuggestion.findFirst({
    where: { id, socialAccount: { lateProfile: { userId } } },
    include: { socialAccount: { include: { lateProfile: true } } },
  });
}

// Helper: compute scheduled date from day + hour in user timezone
function computeScheduledDate(suggestedDay: number, suggestedHour: number, userTz: string): Date {
  const now = new Date();
  const nowParts = new Intl.DateTimeFormat("en-US", {
    timeZone: userTz, weekday: "short", hour: "numeric", hourCycle: "h23",
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
    timeZone: userTz, hour: "numeric", hourCycle: "h23",
  }).formatToParts(scheduledDate);
  const checkHour = parseInt(checkParts.find((p) => p.type === "hour")?.value ?? "0");
  scheduledDate.setUTCHours(scheduledDate.getUTCHours() - (checkHour - suggestedHour));

  return scheduledDate;
}

// PATCH /api/suggestions/[id] — Update suggestion content/media/time
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: errorMessages.UNAUTHORIZED }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { content, mediaUrl, mediaType, suggestedDay, suggestedHour } = body;

    const suggestion = await prisma.postSuggestion.findFirst({
      where: { id, socialAccount: { lateProfile: { userId: session.user.id } } },
    });
    if (!suggestion) return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });

    const data: Record<string, unknown> = {};
    if (content !== undefined) data.content = content;
    if (mediaUrl !== undefined) data.mediaUrl = mediaUrl;
    if (mediaType !== undefined) data.mediaType = mediaType;
    if (suggestedDay !== undefined) data.suggestedDay = suggestedDay;
    if (suggestedHour !== undefined) data.suggestedHour = suggestedHour;

    const updated = await prisma.postSuggestion.update({ where: { id }, data });
    return NextResponse.json({ suggestion: updated });
  } catch (error) {
    return errorHandler(error);
  }
}

// POST /api/suggestions/[id] — Actions: schedule, publish
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: errorMessages.UNAUTHORIZED }, { status: 401 });

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const action = (body as { action?: string }).action ?? "schedule";
    const scheduledAt = (body as { scheduledAt?: string }).scheduledAt;

    const suggestion = await findSuggestion(id, session.user.id);
    if (!suggestion) return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });

    // Check free post limit
    const [user, subscription] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: session.user.id }, select: { timezone: true, postsPublished: true } }),
      prisma.subscription.findUnique({ where: { userId: session.user.id }, select: { status: true } }),
    ]);
    const hasSubscription = subscription?.status === "active" || subscription?.status === "trialing";
    if (!hasSubscription && user.postsPublished >= FREE_POST_LIMIT) {
      return NextResponse.json({ error: "FREE_POST_LIMIT_REACHED" }, { status: 403 });
    }

    const { socialAccount } = suggestion;
    const { lateProfile } = socialAccount;
    const userTz = user.timezone ?? "UTC";

    const mediaItems = suggestion.mediaUrl
      ? [{ url: suggestion.mediaUrl, type: suggestion.mediaType ?? "image" }]
      : undefined;

    // Validate with Zernio before sending
    const validation = await validatePost(
      suggestion.content,
      socialAccount.platform,
      mediaItems,
      lateProfile.lateApiKey
    );
    if (!validation.valid) {
      return NextResponse.json(
        { error: "VALIDATION_FAILED", validationErrors: validation.errors },
        { status: 422 }
      );
    }

    if (action === "publish") {
      // Publish immediately
      const post = await createPost(
        lateProfile.lateProfileId,
        {
          content: suggestion.content,
          platform: { platform: socialAccount.platform, accountId: socialAccount.lateAccountId },
          publishNow: true,
          timezone: userTz,
          ...(mediaItems ? { mediaItems } : {}),
        },
        lateProfile.lateApiKey
      );
      await Promise.all([
        prisma.postSuggestion.delete({ where: { id } }),
        prisma.user.update({ where: { id: session.user.id }, data: { postsPublished: { increment: 1 } } }),
      ]);
      return NextResponse.json({ success: true, postId: post.id, action: "published" });
    }

    // Default: schedule
    const scheduledDate = scheduledAt
      ? new Date(scheduledAt)
      : computeScheduledDate(suggestion.suggestedDay, suggestion.suggestedHour, userTz);
    const post = await createPost(
      lateProfile.lateProfileId,
      {
        content: suggestion.content,
        platform: { platform: socialAccount.platform, accountId: socialAccount.lateAccountId },
        scheduledAt: scheduledDate.toISOString(),
        publishNow: false,
        timezone: userTz,
        ...(mediaItems ? { mediaItems } : {}),
      },
      lateProfile.lateApiKey
    );
    await Promise.all([
      prisma.postSuggestion.delete({ where: { id } }),
      prisma.user.update({ where: { id: session.user.id }, data: { postsPublished: { increment: 1 } } }),
    ]);
    return NextResponse.json({ success: true, postId: post.id, action: "scheduled" });
  } catch (error) {
    return errorHandler(error);
  }
}

// DELETE /api/suggestions/[id] — Delete a suggestion
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
