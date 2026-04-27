import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { createFromBrief } from "@/lib/services/createFromBrief";
import { createFromBriefRequestSchema } from "@/lib/schemas/createFromBrief";
import { claimSuggestionsCooldown } from "@/lib/services/rateLimit";

// Generation runs N parallel chunks per account (5 posts each). The slowest
// account in Promise.allSettled can approach 90–120s for large batches; 240
// leaves comfortable headroom (Vercel Pro max 300).
export const maxDuration = 240;

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json(
        { error: errorMessages.UNAUTHORIZED },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const input = createFromBriefRequestSchema.parse(body);

    const cooldownRemainingMs = await claimSuggestionsCooldown(session.user.id);
    if (cooldownRemainingMs !== null) {
      const retryAfter = Math.ceil(cooldownRemainingMs / 1000);
      return NextResponse.json(
        {
          error: `Just a moment — please wait ${retryAfter} more second${retryAfter === 1 ? "" : "s"} before generating again.`,
          retryAfterSeconds: retryAfter,
        },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfter) },
        }
      );
    }

    const ownedCount = await prisma.socialAccount.count({
      where: {
        id: { in: input.accountIds },
        status: "active",
        lateProfile: { userId: session.user.id },
      },
    });

    if (ownedCount !== input.accountIds.length) {
      return NextResponse.json(
        { error: "One or more accounts not found or not owned by user" },
        { status: 403 }
      );
    }

    const { suggestions, failedAccountIds } = await createFromBrief({
      userId: session.user.id,
      accountIds: input.accountIds,
      brief: input.brief.trim(),
    });

    return NextResponse.json({
      suggestions,
      failedAccountIds,
      failedCount: failedAccountIds.length,
    });
  } catch (error) {
    return errorHandler(error);
  }
}
