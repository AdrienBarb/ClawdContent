import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { coerceMediaItems, mediaItemsSchema } from "@/lib/schemas/mediaItems";
import {
  defaultContentType,
  getPlatformConfig,
} from "@/lib/insights/platformConfig";
import { validateMediaItems } from "@/lib/services/mediaValidation";

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) {
      return NextResponse.json(
        { error: errorMessages.UNAUTHORIZED },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("accountId");

    // Get user's social account IDs
    const lateProfile = await prisma.lateProfile.findUnique({
      where: { userId: session.user.id },
      include: { socialAccounts: { select: { id: true } } },
    });

    if (!lateProfile) {
      return NextResponse.json({ suggestions: [] });
    }

    const userAccountIds = lateProfile.socialAccounts.map((a) => a.id);

    // Validate accountId belongs to user
    if (accountId && !userAccountIds.includes(accountId)) {
      return NextResponse.json({ suggestions: [] });
    }

    const suggestions = await prisma.postSuggestion.findMany({
      where: {
        socialAccountId: accountId ? accountId : { in: userAccountIds },
      },
      orderBy: { createdAt: "desc" },
      include: {
        socialAccount: { select: { platform: true, username: true } },
      },
    });

    return NextResponse.json({
      suggestions: suggestions.map((s) => ({
        ...s,
        mediaItems: coerceMediaItems(s.mediaItems),
      })),
    });
  } catch (error) {
    return errorHandler(error);
  }
}

const createInputSchema = z
  .object({
    socialAccountId: z.string().min(1),
    content: z.string().trim().min(1).max(10000),
    mediaItems: mediaItemsSchema.optional().default([]),
  })
  .strict();

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) {
      return NextResponse.json(
        { error: errorMessages.UNAUTHORIZED },
        { status: 401 }
      );
    }

    const raw = await req.json().catch(() => ({}));
    const input = createInputSchema.parse(raw);

    const account = await prisma.socialAccount.findFirst({
      where: {
        id: input.socialAccountId,
        lateProfile: { userId: session.user.id },
      },
      select: { id: true, platform: true, username: true },
    });
    if (!account) {
      return NextResponse.json(
        { error: "Suggestion not found" },
        { status: 404 }
      );
    }

    const config = getPlatformConfig(account.platform);

    // No platform-level char-limit gate here — the platform itself rejects
    // overlong content at publish time, and accounts with extended limits
    // (e.g. X Premium) wouldn't be supported if we hard-capped on
    // platformConfig.charLimit. The Zod schema's max(10000) is the only
    // server-side safety ceiling.
    const mediaCheck = validateMediaItems(input.mediaItems, account.platform);
    if (!mediaCheck.ok) {
      return NextResponse.json(
        { error: "MEDIA_VALIDATION_FAILED", message: mediaCheck.error },
        { status: 422 }
      );
    }

    const imageCount = input.mediaItems.filter((m) => m.type === "image").length;
    const videoCount = input.mediaItems.filter((m) => m.type === "video").length;
    const contentType =
      videoCount > 0
        ? "video"
        : imageCount > 1
          ? "carousel"
          : imageCount === 1
            ? "image"
            : defaultContentType(config.requiresMedia);

    const slot = config.defaultBestTimes[0] ?? { dayOfWeek: 0, hour: 9 };

    const created = await prisma.postSuggestion.create({
      data: {
        socialAccountId: account.id,
        content: input.content,
        contentType,
        suggestedDay: slot.dayOfWeek,
        suggestedHour: slot.hour,
        mediaItems: input.mediaItems.length > 0 ? input.mediaItems : undefined,
      },
      include: {
        socialAccount: { select: { platform: true, username: true } },
      },
    });

    return NextResponse.json(
      {
        suggestion: {
          ...created,
          mediaItems: coerceMediaItems(created.mediaItems),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return errorHandler(error);
  }
}
