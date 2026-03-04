import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import {
  getChatConfig,
  fetchChatHistory,
  getSessionKey,
} from "@/lib/services/chat";
import type { UIMessage } from "ai";

const DEFAULT_LIMIT = 50;

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
    const before = parseInt(searchParams.get("before") || "", 10);

    const config = await getChatConfig(session.user.id);
    const sessionKey = getSessionKey(session.user.id);
    const allMessages = await fetchChatHistory(config, sessionKey);

    const total = allMessages.length;
    const endIndex = !isNaN(before) && before > 0 ? Math.min(before, total) : total;
    const startIndex = Math.max(endIndex - limit, 0);
    const sliced = allMessages.slice(startIndex, endIndex);

    const uiMessages: UIMessage[] = sliced.map((m, i) => ({
      id: `history-${startIndex + i}`,
      role: m.role as "user" | "assistant",
      content: m.content,
      parts: [{ type: "text" as const, text: m.content }],
    }));

    return NextResponse.json({
      messages: uiMessages,
      hasMore: startIndex > 0,
      nextBefore: startIndex > 0 ? startIndex : undefined,
      total,
    });
  } catch (error) {
    return errorHandler(error);
  }
}
