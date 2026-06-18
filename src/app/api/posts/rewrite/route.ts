import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import {
  buildRewritePrompt,
  buildEditPrompt,
  instructionMap,
  rewriteOutputSchema,
} from "@/lib/ai/rewrite";

// Synchronous model call — a caption rewrite can exceed the platform default.
export const maxDuration = 60;

// `instruction` is either a preset key (shorter/longer/…) or a free-text change
// the user typed ("make it punchier", "drop the emojis"). Presets go through
// buildRewritePrompt; free-text goes through buildEditPrompt, which wraps the
// instruction in <edit_instruction> and strips the tags to resist prompt
// injection.
const rewriteInputSchema = z.object({
  content: z.string().min(1),
  platform: z.string(),
  instruction: z.string().trim().min(1).max(500),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: errorMessages.UNAUTHORIZED }, { status: 401 });
    }

    const body = await req.json();
    const { content, platform, instruction } = rewriteInputSchema.parse(body);

    const userId = session.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { knowledgeBase: true },
    });
    const kb = user?.knowledgeBase as Record<string, unknown> | null;

    const prompt =
      instruction in instructionMap
        ? buildRewritePrompt(content, platform, instruction, kb)
        : buildEditPrompt(content, platform, instruction, kb);

    const { object } = await generateObject({
      model: anthropic("claude-sonnet-4-6"),
      schema: rewriteOutputSchema,
      prompt,
    });

    return NextResponse.json({ content: object.content });
  } catch (error) {
    return errorHandler(error);
  }
}
