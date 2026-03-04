import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { streamText, UIMessage, convertToModelMessages } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import {
  getChatConfig,
  resolveHost,
  createFlyFetch,
  getSessionKey,
} from "@/lib/services/chat";
import { saveChatMessage } from "@/lib/services/chatMessages";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
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

    const { messages }: { messages: UIMessage[] } = await req.json();

    const config = await getChatConfig(session.user.id);

    const hostname = `${config.appName}.fly.dev`;
    const ip = await resolveHost(hostname);

    const provider = createOpenAICompatible({
      name: "openclaw",
      baseURL: `https://${hostname}/v1`,
      apiKey: config.gatewayToken,
      headers: {
        "fly-force-instance-id": config.machineId,
        "x-openclaw-session-key": getSessionKey(session.user.id),
      },
      fetch: createFlyFetch(hostname, ip),
    });

    // Extract and save the last user message
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMessage) {
      const userText = lastUserMessage.parts
        ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("");
      if (userText) {
        await saveChatMessage({
          userId: session.user.id,
          role: "user",
          content: userText,
        });
      }
    }

    const modelMessages = await convertToModelMessages(messages);

    const result = streamText({
      model: provider.chatModel("openclaw:main"),
      messages: modelMessages,
      onFinish: async ({ text }) => {
        if (text) {
          await saveChatMessage({
            userId: session.user.id,
            role: "assistant",
            content: text,
          });
        }
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    return errorHandler(error);
  }
}
