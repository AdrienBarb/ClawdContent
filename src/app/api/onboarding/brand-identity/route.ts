import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { saveBrandIdentitySchema } from "@/lib/schemas/brandIdentity";
import { saveBrandIdentity } from "@/lib/services/brandIdentity";
import { limitOnboardingBrandIdentity } from "@/lib/rateLimit/onboardingLimiter";

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

    const limit = await limitOnboardingBrandIdentity(session.user.id);
    if (!limit.success) {
      const retryAfterSec = limit.reset
        ? Math.max(1, Math.ceil((limit.reset - Date.now()) / 1000))
        : 60;
      return NextResponse.json(
        {
          error: "Too many brand updates. Try again in a moment.",
          retryAfterSeconds: retryAfterSec,
        },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfterSec) },
        }
      );
    }

    const body = await req.json();
    const { brandIdentity } = saveBrandIdentitySchema.parse(body);

    await saveBrandIdentity(session.user.id, brandIdentity);

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorHandler(error);
  }
}
