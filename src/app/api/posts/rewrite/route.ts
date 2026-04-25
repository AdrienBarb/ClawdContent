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

const rewriteInputSchema = z.object({
  content: z.string().min(1),
  platform: z.string(),
  instruction: z.enum(["rewrite", "shorter", "longer", "casual", "professional", "hashtags", "fix"]),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: errorMessages.UNAUTHORIZED }, { status: 401 });
    }

    const body = await req.json();
    const { content, platform, instruction } = rewriteInputSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { knowledgeBase: true },
    });
    const kb = user?.knowledgeBase as Record<string, unknown> | null;

    const { object } = await generateObject({
      model: anthropic("claude-sonnet-4-6"),
      schema: rewriteOutputSchema,
      prompt: buildRewritePrompt(content, platform, instruction, kb),
    });

    return NextResponse.json({ content: object.content });
  } catch (error) {
    return errorHandler(error);
  }
}
