import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import {
  generateSuggestions,
  type SuggestionWithAccount,
} from "@/lib/services/postSuggestions";
import { computeInsights } from "@/lib/services/accountInsights";
import { claimSuggestionsCooldown } from "@/lib/services/rateLimit";
import { coerceMediaItems } from "@/lib/schemas/mediaItems";

// Generation runs N parallel chunks per account (5 posts each), plus an
// optional inline insights refresh when the cache is missing/stale. The
// slowest account in Promise.allSettled can approach 90–120s; 240 leaves
// comfortable headroom (Vercel Pro max 300).
export const maxDuration = 240;

const STALE_INSIGHTS_MS = 7 * 24 * 60 * 60 * 1000;

const generateInputSchema = z.object({
  topic: z.string().trim().max(4000).optional(),
  accountIds: z
    .array(z.string().min(1))
    .min(1)
    .max(10)
    .refine((arr) => new Set(arr).size === arr.length, {
      message: "Duplicate accountIds are not allowed",
    }),
});

function insightsAreStale(lastAnalyzedAt: Date | null, insights: unknown): boolean {
  if (!insights || !lastAnalyzedAt) return true;
  return Date.now() - lastAnalyzedAt.getTime() > STALE_INSIGHTS_MS;
}

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
    const input = generateInputSchema.parse(body);

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

    const lateProfile = await prisma.lateProfile.findUnique({
      where: { userId: session.user.id },
      include: { socialAccounts: { where: { status: "active" } } },
    });

    if (!lateProfile || lateProfile.socialAccounts.length === 0) {
      return NextResponse.json(
        { error: "No connected accounts" },
        { status: 400 }
      );
    }

    const accounts = lateProfile.socialAccounts.filter((a) =>
      input.accountIds.includes(a.id)
    );

    if (accounts.length !== input.accountIds.length) {
      return NextResponse.json(
        { error: "One or more accounts not found or not owned by user" },
        { status: 403 }
      );
    }

    const settled = await Promise.allSettled(
      accounts.map(async (account) => {
        if (insightsAreStale(account.lastAnalyzedAt, account.insights)) {
          console.log(
            `[suggestions:generate] insights stale for ${account.id} — refreshing inline before generating`
          );
          await computeInsights(account.id, { source: "all" });
        }
        return generateSuggestions(account.id, {
          topic: input.topic,
        });
      })
    );

    const allSuggestions: SuggestionWithAccount[] = [];
    const failedAccountIds: string[] = [];
    settled.forEach((res, i) => {
      if (res.status === "fulfilled") {
        allSuggestions.push(...res.value);
      } else {
        failedAccountIds.push(accounts[i].id);
        const reason =
          res.reason instanceof Error
            ? (res.reason.stack ?? res.reason.message)
            : String(res.reason);
        console.warn(
          `[suggestions:generate] ⚠️  failed for account ${accounts[i].id}: ${reason}`
        );
      }
    });

    return NextResponse.json({
      suggestions: allSuggestions.map((s) => ({
        ...s,
        mediaItems: coerceMediaItems(s.mediaItems),
      })),
      failedAccountIds,
      failedCount: failedAccountIds.length,
    });
  } catch (error) {
    return errorHandler(error);
  }
}
