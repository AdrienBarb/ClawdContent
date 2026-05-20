import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { approvePostSuggestion } from "@/lib/services/posts";

export async function POST(
  _req: NextRequest,
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
    const result = await approvePostSuggestion(session.user.id, id);

    if (result.ok) {
      return NextResponse.json({
        success: true,
        externalId: result.externalId,
      });
    }

    switch (result.error) {
      case "not_found":
        return NextResponse.json({ error: "Post not found" }, { status: 404 });
      case "not_in_approval_mode":
        return NextResponse.json(
          {
            error: "NOT_IN_APPROVAL_MODE",
            message:
              "This post was already set to autopublish — no approval needed.",
          },
          { status: 409 }
        );
      case "already_approved":
        return NextResponse.json(
          { error: "ALREADY_APPROVED", message: "Already approved." },
          { status: 409 }
        );
      case "no_schedule_staged":
        return NextResponse.json(
          {
            error: "NO_SCHEDULE_STAGED",
            message: "Pick a schedule time before approving.",
          },
          { status: 422 }
        );
      case "schedule_in_past":
        return NextResponse.json(
          {
            error: "SCHEDULE_IN_PAST",
            message: "That schedule time has passed. Pick a new one.",
          },
          { status: 422 }
        );
      case "schedule_failed":
        return NextResponse.json(
          { error: "SCHEDULE_FAILED", message: result.message },
          { status: 500 }
        );
      default: {
        const _exhaustive: never = result;
        void _exhaustive;
        return NextResponse.json(
          { error: "UNHANDLED_RESULT" },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    return errorHandler(error);
  }
}
