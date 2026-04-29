import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { coerceMediaItems, mediaItemsSchema } from "@/lib/schemas/mediaItems";
import { validateMediaItems } from "@/lib/services/mediaValidation";
import { publishOrScheduleSuggestion } from "@/lib/services/publishSuggestion";

const patchInputSchema = z
  .object({
    content: z.string().trim().min(1).max(10000).optional(),
    mediaItems: mediaItemsSchema.optional(),
    suggestedDay: z.number().int().min(0).max(6).optional(),
    suggestedHour: z.number().int().min(0).max(23).optional(),
    scheduledAt: z.union([z.string().datetime(), z.null()]).optional(),
  })
  .strict();

const postActionSchema = z
  .object({
    action: z.enum(["schedule", "publish"]),
  })
  .strict();

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  return session;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: errorMessages.UNAUTHORIZED }, { status: 401 });

    const { id } = await params;
    const raw = await req.json().catch(() => ({}));
    const input = patchInputSchema.parse(raw);

    const existing = await prisma.postSuggestion.findFirst({
      where: { id, socialAccount: { lateProfile: { userId: session.user.id } } },
      include: { socialAccount: { select: { platform: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });
    }

    if (input.mediaItems !== undefined) {
      const result = validateMediaItems(input.mediaItems, existing.socialAccount.platform);
      if (!result.ok) {
        return NextResponse.json(
          { error: "MEDIA_VALIDATION_FAILED", message: result.error },
          { status: 422 }
        );
      }
    }

    if (typeof input.scheduledAt === "string") {
      const parsed = new Date(input.scheduledAt);
      if (parsed.getTime() <= Date.now()) {
        return NextResponse.json(
          {
            error: "INVALID_SCHEDULE",
            message: "Schedule time must be in the future.",
          },
          { status: 400 }
        );
      }
      const oneYearMs = 365 * 24 * 60 * 60 * 1000;
      if (parsed.getTime() > Date.now() + oneYearMs) {
        return NextResponse.json(
          {
            error: "INVALID_SCHEDULE",
            message: "Schedule time can't be more than a year out.",
          },
          { status: 400 }
        );
      }
    }

    const data: Record<string, unknown> = {};
    if (input.content !== undefined) data.content = input.content;
    if (input.mediaItems !== undefined) data.mediaItems = input.mediaItems;
    if (input.suggestedDay !== undefined) data.suggestedDay = input.suggestedDay;
    if (input.suggestedHour !== undefined) data.suggestedHour = input.suggestedHour;
    if (input.scheduledAt !== undefined) {
      data.scheduledAt =
        input.scheduledAt === null ? null : new Date(input.scheduledAt);
    }

    const updated = await prisma.postSuggestion.update({ where: { id }, data });
    return NextResponse.json({
      suggestion: { ...updated, mediaItems: coerceMediaItems(updated.mediaItems) },
    });
  } catch (error) {
    return errorHandler(error);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: errorMessages.UNAUTHORIZED }, { status: 401 });

    const { id } = await params;
    const raw = await req.json().catch(() => ({}));
    const { action } = postActionSchema.parse(raw);

    const result = await publishOrScheduleSuggestion({
      userId: session.user.id,
      suggestionId: id,
      action,
    });

    if (result.ok) {
      if (result.partial) {
        return NextResponse.json(
          {
            error: "PUBLISH_PARTIAL",
            postId: result.postId,
            message:
              result.action === "scheduled"
                ? "Post scheduled — refresh to clear it from your drafts."
                : "Post published — refresh to clear it from your drafts.",
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
        return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });
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
        return NextResponse.json({ error: "FREE_POST_LIMIT_REACHED" }, { status: 403 });
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
    }
  } catch (error) {
    return errorHandler(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: errorMessages.UNAUTHORIZED }, { status: 401 });

    const { id } = await params;
    const suggestion = await prisma.postSuggestion.findFirst({
      where: { id, socialAccount: { lateProfile: { userId: session.user.id } } },
    });
    if (!suggestion) return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });

    await prisma.postSuggestion.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorHandler(error);
  }
}
