import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { onboardingSaveSchema } from "@/lib/schemas/onboarding";
import { saveOnboardingProgress } from "@/lib/services/onboarding";

// Generic partial save used by screens 2 (step only), 3 (goal), 4 (business
// facts) and 5 (branding). Thin: validate → service → return.
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json(
        { error: errorMessages.UNAUTHORIZED },
        { status: 401 }
      );
    }

    const data = onboardingSaveSchema.parse(await req.json());
    await saveOnboardingProgress(session.user.id, data);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return errorHandler(error);
  }
}
