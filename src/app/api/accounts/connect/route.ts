import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { getConnectUrl } from "@/lib/services/accounts";
import { connectAccountSchema } from "@/lib/schemas/accounts";
import { appRouter } from "@/lib/constants/appRouter";
import { prisma } from "@/lib/db/prisma";
import { getPlan, resolvePlanId } from "@/lib/constants/plans";
import { isSupportedPlatform } from "@/lib/insights/platformConfig";

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

    const body = await req.json();
    const { platform, returnTo, onboarding } = connectAccountSchema.parse(body);

    // Check account limit for user's plan
    const [subscription, lateProfile] = await Promise.all([
      prisma.subscription.findUnique({
        where: { userId: session.user.id },
      }),
      prisma.lateProfile.findUnique({
        where: { userId: session.user.id },
        include: { socialAccounts: { where: { status: "active" } } },
      }),
    ]);

    const planId = resolvePlanId(subscription?.planId);
    const plan = getPlan(planId);
    const activeAccountCount = (lateProfile?.socialAccounts ?? []).filter((a) =>
      isSupportedPlatform(a.platform)
    ).length;

    if (activeAccountCount >= plan.socialAccountLimit) {
      return NextResponse.json(
        {
          error: "ACCOUNT_LIMIT_REACHED",
          limit: plan.socialAccountLimit,
          planId,
          planName: plan.name,
        },
        { status: 403 }
      );
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    // Onboarding connects stay inside the onboarding shell — bounce OAuth back
    // through /onboarding/connected, never the dashboard callback under /d.
    const callbackPath = onboarding
      ? appRouter.onboardingCallback
      : appRouter.accountsCallback;
    const callbackUrl = new URL(`${baseUrl}${callbackPath}`);
    if (returnTo) callbackUrl.searchParams.set("returnTo", returnTo);
    const redirectUrl = callbackUrl.toString();

    const url = await getConnectUrl(session.user.id, platform, redirectUrl);

    return NextResponse.json({ url }, { status: 200 });
  } catch (error) {
    return errorHandler(error);
  }
}
