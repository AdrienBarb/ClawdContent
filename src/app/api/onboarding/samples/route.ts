import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { generateOnboardingSamples } from "@/lib/services/onboardingSamples";

// Final screen: generate 2-3 sample drafts from the brand + connected account.
// Synchronous Claude call (like the chat tool) — give it headroom.
export const maxDuration = 120;

export async function POST() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json(
        { error: errorMessages.UNAUTHORIZED },
        { status: 401 }
      );
    }

    const suggestions = await generateOnboardingSamples({
      userId: session.user.id,
    });

    return NextResponse.json({ suggestions }, { status: 200 });
  } catch (error) {
    return errorHandler(error);
  }
}
