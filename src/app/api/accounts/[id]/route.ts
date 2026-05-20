import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { patchSocialAccountSchema } from "@/lib/schemas/accounts";
import { updateAccountSettings } from "@/lib/services/strategy";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json(
        { error: errorMessages.UNAUTHORIZED },
        { status: 401 }
      );
    }

    const { id } = await params;
    const raw = await req.json().catch(() => ({}));
    const input = patchSocialAccountSchema.parse(raw);

    const result = await updateAccountSettings(session.user.id, id, input);

    if (result.ok) {
      return NextResponse.json({
        success: true,
        autopublish: result.autopublish,
        strategy: result.strategy,
      });
    }

    if (result.error === "not_found") {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }
    if (result.error === "invalid_strategy") {
      return NextResponse.json(
        { error: "INVALID_STRATEGY", message: result.message },
        { status: 422 }
      );
    }
  } catch (error) {
    return errorHandler(error);
  }
}
