import { auth } from "@/lib/better-auth/auth";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { isSupportedPlatform } from "@/lib/insights/platformConfig";
import { coerceMediaItems } from "@/lib/schemas/mediaItems";
import { strategySchema } from "@/lib/schemas/strategy";
import { DEFAULT_CADENCE } from "@/lib/constants/cadence";
import PlatformDashboard from "@/components/dashboard/platform/PlatformDashboard";

// 7-day rolling window starting at "today, midnight in user's tz". We
// approximate locally with server now() — the calendar UI re-bins on the
// client using the user's local Date so off-by-tz never strands a post.
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export default async function PerPlatformDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ platform: string }>;
  searchParams: Promise<{ accountId?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/");

  const { platform } = await params;
  const { accountId } = await searchParams;

  if (!isSupportedPlatform(platform)) notFound();

  const lateProfile = await prisma.lateProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!lateProfile) redirect("/onboarding");

  const accountsForPlatform = await prisma.socialAccount.findMany({
    where: {
      lateProfileId: lateProfile.id,
      platform,
      status: "active",
    },
    orderBy: { createdAt: "asc" },
  });

  if (accountsForPlatform.length === 0) {
    return (
      <PlatformDashboard
        platform={platform}
        account={null}
        accountsOnPlatform={[]}
        suggestions={[]}
        cadenceDefault={DEFAULT_CADENCE[platform] ?? null}
      />
    );
  }

  // If `?accountId=` is provided but doesn't match any of the user's
  // accounts on this platform (deleted? cross-tenant guess?), 404 rather
  // than silently swapping to a different account — sharing a deep-link
  // should be all-or-nothing.
  if (accountId && !accountsForPlatform.some((a) => a.id === accountId)) {
    notFound();
  }
  const account =
    accountsForPlatform.find((a) => a.id === accountId) ?? accountsForPlatform[0];

  const now = new Date();
  const windowEnd = new Date(now.getTime() + SEVEN_DAYS_MS);
  // Bound the unscheduled-drafts branch so a user with months of
  // approval-mode backlog doesn't ship the whole pile in the page payload.
  const UNSCHEDULED_DRAFTS_CAP = 30;

  const rawSuggestions = await prisma.postSuggestion.findMany({
    where: {
      socialAccountId: account.id,
      OR: [
        // Scheduled inside the next 7 days
        { scheduledAt: { gte: now, lte: windowEnd } },
        // Or unscheduled drafts — show them so users can finish them
        { scheduledAt: null },
      ],
    },
    orderBy: [{ scheduledAt: "asc" }, { createdAt: "asc" }],
    take: UNSCHEDULED_DRAFTS_CAP + 14, // worst case 14 days × 2 posts + cap
  });

  const strategyParse = strategySchema.safeParse(account.strategy);

  return (
    <PlatformDashboard
      platform={platform}
      account={{
        id: account.id,
        platform: account.platform,
        username: account.username,
        autopublish: account.autopublish,
        generationEnabled: account.generationEnabled,
        strategyDefinedAt: account.strategyDefinedAt
          ? account.strategyDefinedAt.toISOString()
          : null,
        strategy: strategyParse.success ? strategyParse.data : null,
      }}
      accountsOnPlatform={accountsForPlatform.map((a) => ({
        id: a.id,
        username: a.username,
      }))}
      suggestions={rawSuggestions.map((s) => ({
        id: s.id,
        content: s.content,
        contentType: s.contentType,
        suggestedDay: s.suggestedDay,
        suggestedHour: s.suggestedHour,
        scheduledAt: s.scheduledAt ? s.scheduledAt.toISOString() : null,
        imageUrl: s.imageUrl,
        approvalRequired: s.approvalRequired,
        approvedAt: s.approvedAt ? s.approvedAt.toISOString() : null,
        publishedExternalId: s.publishedExternalId,
        mediaItems: coerceMediaItems(s.mediaItems),
        reasoning: s.reasoning,
      }))}
      cadenceDefault={DEFAULT_CADENCE[platform] ?? null}
    />
  );
}
