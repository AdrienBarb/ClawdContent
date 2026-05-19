import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { publishOrScheduleSuggestion } from "@/lib/services/publishSuggestion";

const approveBatchSchema = z
  .object({
    approvedIds: z.array(z.string()).max(20),
    skippedIds: z.array(z.string()).max(20),
  })
  .refine(
    (v) => v.approvedIds.length + v.skippedIds.length > 0,
    "At least one approvedId or skippedId required"
  )
  .refine((v) => {
    const overlap = v.approvedIds.some((id) => v.skippedIds.includes(id));
    return !overlap;
  }, "approvedIds and skippedIds must be disjoint");

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
    const { approvedIds, skippedIds } = approveBatchSchema.parse(body);

    const userId = session.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { version: true, firstBatchApproved: true },
    });

    if (!user || user.version !== "v2" || user.firstBatchApproved) {
      return NextResponse.json(
        { error: "FIRST_BATCH_ALREADY_APPROVED" },
        { status: 409 }
      );
    }

    // Tenant-scope: only consider suggestions the user owns. Defends against
    // IDOR probing — unowned IDs disappear silently rather than returning
    // differentiated error codes that leak ownership.
    const requestedIds = [...approvedIds, ...skippedIds];
    const owned = await prisma.postSuggestion.findMany({
      where: {
        id: { in: requestedIds },
        socialAccount: { lateProfile: { userId } },
      },
      select: { id: true },
    });
    const ownedSet = new Set(owned.map((s) => s.id));
    const ownedApproved = approvedIds.filter((id) => ownedSet.has(id));
    const ownedSkipped = skippedIds.filter((id) => ownedSet.has(id));

    let scheduled = 0;
    let failed = 0;

    for (const id of ownedApproved) {
      const result = await publishOrScheduleSuggestion({
        userId,
        suggestionId: id,
        action: "schedule",
      });
      if (result.ok) {
        scheduled += 1;
      } else {
        failed += 1;
        console.warn(
          `[approve-batch] schedule failed user=${userId} suggestion=${id} code=${result.error}`
        );
      }
    }

    if (ownedSkipped.length > 0) {
      await prisma.postSuggestion.deleteMany({
        where: {
          id: { in: ownedSkipped },
          socialAccount: { lateProfile: { userId } },
        },
      });
    }

    // Only flip the gate when something landed. If every schedule failed and
    // nothing was skipped, leave firstBatchApproved=false so the user can retry
    // rather than dead-ending on a blank dashboard.
    const completed = scheduled > 0 || ownedSkipped.length > 0;
    if (completed) {
      await prisma.user.update({
        where: { id: userId },
        data: { firstBatchApproved: true },
      });
    }

    return NextResponse.json({
      scheduled,
      skipped: ownedSkipped.length,
      failed,
      completed,
    });
  } catch (error) {
    return errorHandler(error);
  }
}
