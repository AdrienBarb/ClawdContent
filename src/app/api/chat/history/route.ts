import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import {
  getChatConfig,
  fetchChatHistory,
  getSessionKey,
} from "@/lib/services/chat";
import type { UIMessage } from "ai";

export async function GET() {
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

    const config = await getChatConfig(session.user.id);
    const sessionKey = getSessionKey(session.user.id);

    const rawMessages = await fetchChatHistory(config, sessionKey);

    const uiMessages: UIMessage[] = rawMessages.map((m, i) => ({
      id: `history-${i}`,
      role: m.role as "user" | "assistant",
      content: m.content,
      parts: [{ type: "text" as const, text: m.content }],
    }));

    return NextResponse.json({ messages: uiMessages });
  } catch (error) {
    return errorHandler(error);
  }
}
