import { NextResponse } from "next/server";
import type { PublishResult } from "@/lib/services/publishSuggestion";

interface MapOptions {
  /** Message for the `not_found` case (the two callers name the entity differently). */
  notFoundMessage: string;
  /** Message for a partial success (only used when not treated as success). */
  partialMessage?: (action: "published" | "scheduled") => string;
  /**
   * /explore's ephemeral commit deletes its lazily-created row on a partial
   * success (the post is already live on Zernio), so it surfaces partials as a
   * plain success instead of a 500. The suggestions route keeps the 500.
   */
  treatPartialAsSuccess?: boolean;
}

/**
 * Single source of truth mapping a `PublishResult` to an HTTP response. Shared
 * by every route that commits via `publishOrScheduleSuggestion` so a new result
 * variant can't drift between callers — the `default` arm guarantees an unknown
 * variant returns a 500, never a silent empty 200.
 */
export function publishResultToResponse(
  result: PublishResult,
  options: MapOptions
): NextResponse {
  if (result.ok) {
    if (result.partial && !options.treatPartialAsSuccess) {
      return NextResponse.json(
        {
          error: "PUBLISH_PARTIAL",
          postId: result.postId,
          message:
            options.partialMessage?.(result.action) ??
            "Done — refresh to see it.",
        },
        { status: 500 }
      );
    }
    return NextResponse.json({
      success: true,
      postId: result.postId,
      action: result.action,
    });
  }

  switch (result.error) {
    case "not_found":
      return NextResponse.json(
        { error: options.notFoundMessage },
        { status: 404 }
      );
    case "already_publishing":
      return NextResponse.json(
        {
          error: "ALREADY_PUBLISHING",
          message:
            "This post is already being published — give it a few seconds.",
        },
        { status: 409 }
      );
    case "free_post_limit_reached":
      return NextResponse.json(
        { error: "FREE_POST_LIMIT_REACHED" },
        { status: 403 }
      );
    case "no_schedule_staged":
      return NextResponse.json(
        { error: "NO_SCHEDULE_STAGED", message: "Pick a schedule time first." },
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
    case "media_validation_failed":
      return NextResponse.json(
        { error: "MEDIA_VALIDATION_FAILED", message: result.message },
        { status: 422 }
      );
    case "validation_failed":
      return NextResponse.json(
        { error: "VALIDATION_FAILED", validationErrors: result.validationErrors },
        { status: 422 }
      );
    case "publish_failed":
      return NextResponse.json(
        { error: "PUBLISH_FAILED", message: result.message },
        { status: 500 }
      );
    default:
      return NextResponse.json({ error: "PUBLISH_FAILED" }, { status: 500 });
  }
}
