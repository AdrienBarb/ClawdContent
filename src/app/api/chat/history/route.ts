import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { getChatHistory } from "@/lib/services/chatMessages";
import type { UIMessage } from "ai";

const DEFAULT_LIMIT = 25;

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) {
      return NextResponse.json(
        { error: errorMessages.UNAUTHORIZED },
        { status: 401 }
      );
    }

    const { searchParams } = req.nextUrl;
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "", 10) || DEFAULT_LIMIT, 1),
      500
    );
    const cursor = searchParams.get("cursor") || undefined;

    const { messages, hasMore, nextCursor } = await getChatHistory({
      userId: session.user.id,
      limit,
      cursor,
    });

    const uiMessages: UIMessage[] = messages.map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
      parts: (Array.isArray(m.parts) ? m.parts : null) as UIMessage["parts"] ?? [
        { type: "text" as const, text: m.content },
      ],
    }));

    return NextResponse.json({
      messages: uiMessages,
      hasMore,
      nextCursor,
    });
  } catch (error) {
    return errorHandler(error);
  }
}
