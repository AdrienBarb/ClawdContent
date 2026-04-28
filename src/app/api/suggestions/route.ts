import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { coerceMediaItems } from "@/lib/schemas/mediaItems";

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
