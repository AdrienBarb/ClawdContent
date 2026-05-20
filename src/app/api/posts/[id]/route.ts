import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { updatePostSuggestionSchema } from "@/lib/schemas/posts";
import {
  updatePostSuggestion,
  deletePostSuggestion,
} from "@/lib/services/posts";

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
    const input = updatePostSuggestionSchema.parse(raw);

    const result = await updatePostSuggestion(session.user.id, id, input);

    if (result.ok) {
      return NextResponse.json({ success: true });
    }

    if (result.error === "not_found") {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    if (result.error === "invalid_schedule") {
      return NextResponse.json(
        { error: "INVALID_SCHEDULE", message: result.message },
        { status: 400 }
      );
    }
    if (result.error === "media_validation_failed") {
      return NextResponse.json(
        { error: "MEDIA_VALIDATION_FAILED", message: result.message },
        { status: 422 }
      );
    }
    if (result.error === "already_published") {
      return NextResponse.json(
        { error: "ALREADY_PUBLISHED", message: result.message },
        { status: 409 }
      );
    }

    const _exhaustive: never = result;
    void _exhaustive;
    return NextResponse.json({ error: "UNHANDLED_RESULT" }, { status: 500 });
  } catch (error) {
    return errorHandler(error);
  }
}

export async function DELETE(
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
    const result = await deletePostSuggestion(session.user.id, id);

    if (result.ok) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  } catch (error) {
    return errorHandler(error);
  }
}
