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
import { consume, refund } from "@/lib/services/usage";

const rewriteInputSchema = z.object({
  instruction: z.enum(["rewrite", "shorter", "longer", "casual", "professional", "hashtags", "fix"]),
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

    const userId = session.user.id;
    const dedupKey = `consume:rewrite:suggestion:${id}:${crypto.randomUUID()}`;

    // Pre-flight + atomic consume; UsageLimitError → 402 via errorHandler.
    await consume({
      userId,
      type: "rewrite",
      count: 1,
      dedupKey,
      metadata: { suggestionId: id, instruction },
    });

    const kb = suggestion.socialAccount.lateProfile.user.knowledgeBase as Record<string, unknown> | null;

    try {
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
    } catch (err) {
      await refund({
        userId,
        type: "rewrite",
        count: 1,
        dedupKey: `refund:${dedupKey}`,
        originalConsumeDedupKey: dedupKey,
      }).catch((refundErr) => {
        console.error(
          `[/api/suggestions/${id}/rewrite] refund failed: ${refundErr instanceof Error ? refundErr.message : refundErr}`
        );
      });
      throw err;
    }
  } catch (error) {
    return errorHandler(error);
  }
}
