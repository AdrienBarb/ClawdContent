import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { buildRewritePrompt, rewriteOutputSchema } from "@/lib/ai/rewrite";

// Synchronous model call — give it room (a long caption rewrite can exceed the
// platform default), matching the other generate* routes (chat/explore/actions).
export const maxDuration = 60;

// Accepts a preset keyword (rewrite/shorter/longer/casual/professional/hashtags/fix,
// mapped in instructionMap) OR a free-text instruction from the week-card
// "Rewrite caption" panel — buildRewritePrompt falls through to the raw string
// for anything not in the map.
const rewriteInputSchema = z.object({
  instruction: z.string().trim().min(1).max(500),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: errorMessages.UNAUTHORIZED }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { instruction } = rewriteInputSchema.parse(body);

    const suggestion = await prisma.postSuggestion.findFirst({
      where: { id, socialAccount: { lateProfile: { userId: session.user.id } } },
      include: { socialAccount: { select: { platform: true, lateProfile: { select: { user: { select: { knowledgeBase: true } } } } } } },
    });

    if (!suggestion) {
      return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });
    }

    const kb = suggestion.socialAccount.lateProfile.user.knowledgeBase as Record<string, unknown> | null;

    const { object } = await generateObject({
      model: anthropic("claude-sonnet-4-6"),
      schema: rewriteOutputSchema,
      prompt: buildRewritePrompt(suggestion.content, suggestion.socialAccount.platform, instruction, kb),
    });

    await prisma.postSuggestion.update({
      where: { id },
      data: { content: object.content },
    });

    return NextResponse.json({ content: object.content });
  } catch (error) {
    return errorHandler(error);
  }
}
