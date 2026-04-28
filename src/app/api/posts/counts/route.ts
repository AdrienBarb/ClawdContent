import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { listPosts } from "@/lib/late/mutations";

// One round-trip per status, but in parallel — replaces 4 separate
// /api/posts?status=… calls fired from ChannelPage on every render.
const STATUSES = ["scheduled", "published", "draft", "failed"] as const;
type Status = (typeof STATUSES)[number];

const querySchema = z.object({
  platform: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json(
        { error: errorMessages.UNAUTHORIZED },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const { platform } = querySchema.parse({
      platform: searchParams.get("platform") || undefined,
    });

    const lateProfile = await prisma.lateProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!lateProfile) {
      return NextResponse.json({
        scheduled: 0,
        published: 0,
        draft: 0,
        failed: 0,
      });
    }

    // Parallel single-result queries — Zernio doesn't expose a counts endpoint
    // so we fan out 4 list calls with limit=1 and read pagination.total.
    const results = await Promise.all(
      STATUSES.map(async (status) => {
        const result = await listPosts(
          lateProfile.lateProfileId,
          lateProfile.lateApiKey,
          { status, limit: 1, ...(platform ? { platform } : {}) }
        );
        return [status, result.pagination?.total ?? 0] as const;
      })
    );

    const counts = Object.fromEntries(results) as Record<Status, number>;
    return NextResponse.json(counts);
  } catch (error) {
    return errorHandler(error);
  }
}
