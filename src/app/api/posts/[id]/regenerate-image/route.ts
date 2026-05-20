import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { regeneratePostSuggestionImage } from "@/lib/services/posts";

// gpt-image-1 calls can take 30-60s for 1024x1536; default 60s would clip
// the longer ones. Keep some headroom for Cloudinary upload too.
export const maxDuration = 120;

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
    const result = await regeneratePostSuggestionImage(session.user.id, id);

    if (result.ok) {
      return NextResponse.json({ success: true, url: result.url });
    }

    switch (result.reason) {
      case "not_found":
        return NextResponse.json({ error: "Post not found" }, { status: 404 });
      case "platform_not_image_required":
        return NextResponse.json(
          {
            error: "PLATFORM_NOT_IMAGE_REQUIRED",
            message: "This platform doesn't use generated images.",
          },
          { status: 422 }
        );
      case "cap_exceeded":
        return NextResponse.json(
          {
            error: "WEEKLY_IMAGE_CAP",
            message: `You've hit this week's image cap (${result.current}/${result.cap}). It resets next week.`,
          },
          { status: 429 }
        );
      case "image_too_large":
        return NextResponse.json(
          {
            error: "IMAGE_TOO_LARGE",
            message: "The generated image was unexpectedly large. Try again.",
          },
          { status: 500 }
        );
      case "generation_failed":
        return NextResponse.json(
          { error: "GENERATION_FAILED", message: result.message },
          { status: 500 }
        );
      case "already_has_image":
        // Shouldn't happen — the service clears `imageUrl` first — but bubble
        // safely just in case.
        return NextResponse.json(
          { error: "ALREADY_HAS_IMAGE" },
          { status: 409 }
        );
      case "already_regenerating":
        return NextResponse.json(
          {
            error: "ALREADY_REGENERATING",
            message: "We're already regenerating this image — give it a sec.",
          },
          { status: 409 }
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
