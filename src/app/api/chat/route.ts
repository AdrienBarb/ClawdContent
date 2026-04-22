import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import {
  streamText,
  UIMessage,
  convertToModelMessages,
  stepCountIs,
} from "ai";
import type { Prisma } from "@prisma/client";
import { model } from "@/lib/ai/provider";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { createZernioTools } from "@/lib/ai/tools";
import { saveChatMessage } from "@/lib/services/chatMessages";
import { captureServerEvent } from "@/lib/tracking/postHogClient";
import { prisma } from "@/lib/db/prisma";

export const maxDuration = 300;

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

    const userId = session.user.id;

    // Fetch user data needed for system prompt and tools
    const [user, subscription, lateProfile, userMessageCount] =
      await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            name: true,
            timezone: true,
            onboardingRole: true,
            onboardingNiche: true,
            onboardingTopics: true,
            onboardingGoal: true,
            strategy: true,
          },
        }),
        prisma.subscription.findUnique({
          where: { userId },
          select: { status: true, planId: true },
        }),
        prisma.lateProfile.findUnique({
          where: { userId },
          include: {
            socialAccounts: {
              where: { status: "active" },
              select: { platform: true, username: true, lateAccountId: true },
            },
          },
        }),
        prisma.chatMessage.count({
          where: { userId, role: "user" },
        }),
      ]);

    const hasActiveSubscription =
      subscription &&
      (subscription.status === "active" || subscription.status === "trialing");

    // Allow 1 free message, then require subscription
    if (!hasActiveSubscription && userMessageCount >= 1) {
      return NextResponse.json(
        { error: "SUBSCRIPTION_REQUIRED" },
        { status: 403 }
      );
    }

    // Require connected accounts to chat
    if (!lateProfile || lateProfile.socialAccounts.length === 0) {
      return NextResponse.json(
        { error: "NO_CONNECTED_ACCOUNTS" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const rawMessages = body?.messages;

    if (!Array.isArray(rawMessages)) {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }

    // Sanitize messages: strip system role, cap length, remove incomplete tool calls
    const messages: UIMessage[] = (rawMessages as UIMessage[])
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-20)
      .map((m) => {
        const filteredParts = (m.parts ?? []).filter((p) => {
          if (p == null || typeof p !== "object" || !("type" in p)) return false;
          if (p.type === "text" || p.type === "step-start") return true;
          if (
            (p.type === "dynamic-tool" ||
              (typeof p.type === "string" && p.type.startsWith("tool-"))) &&
            "toolCallId" in p &&
            typeof p.toolCallId === "string" &&
            "toolName" in p &&
            typeof p.toolName === "string" &&
            "state" in p &&
            p.state === "output-available" &&
            "output" in p &&
            p.output !== undefined
          ) {
            return true;
          }
          return false;
        });

        // For assistant messages: ensure tool-call parts and text parts are in
        // separate steps. The Anthropic API requires tool_use at the end of an
        // assistant message — text after tool_use is invalid. Inserting a
        // step-start between them makes convertToModelMessages produce:
        //   assistant([tool_use]) → tool([tool_result]) → assistant([text])
        if (m.role === "assistant") {
          const hasToolParts = filteredParts.some(
            (p) => p.type === "dynamic-tool" || (typeof p.type === "string" && p.type.startsWith("tool-"))
          );
          const hasTextAfterTool = hasToolParts && filteredParts.some((p, i) => {
            if (p.type !== "text") return false;
            return filteredParts.slice(0, i).some(
              (prev) => prev.type === "dynamic-tool" || (typeof prev.type === "string" && prev.type.startsWith("tool-"))
            );
          });

          if (hasTextAfterTool) {
            // Rebuild parts: [step-start, ...tools, step-start, ...texts]
            const toolParts = filteredParts.filter(
              (p) => p.type === "dynamic-tool" || (typeof p.type === "string" && p.type.startsWith("tool-"))
            );
            const textParts = filteredParts.filter((p) => p.type === "text");
            return {
              ...m,
              parts: [
                { type: "step-start" as const },
                ...toolParts,
                { type: "step-start" as const },
                ...textParts,
              ] as UIMessage["parts"],
            };
          }
        }

        return { ...m, parts: filteredParts };
      });

    // Build system prompt from user data
    const systemPrompt = buildSystemPrompt({
      name: user?.name ?? "User",
      timezone: user?.timezone ?? null,
      onboardingRole: user?.onboardingRole ?? null,
      onboardingNiche: user?.onboardingNiche ?? null,
      onboardingTopics: user?.onboardingTopics ?? [],
      onboardingGoal: user?.onboardingGoal ?? null,
      strategy: user?.strategy ?? null,
      planId: subscription?.planId ?? "starter",
      accounts: lateProfile.socialAccounts,
    });

    // Create tools with user's scoped API key and account mappings
    const tools = createZernioTools(
      lateProfile.lateApiKey,
      lateProfile.lateProfileId,
      lateProfile.socialAccounts,
      user?.timezone ?? "UTC",
      userId
    );

    // Extract and save the last user message
    const lastUserMessage = [...messages]
      .reverse()
      .find((m) => m.role === "user");
    if (lastUserMessage) {
      const userText = lastUserMessage.parts
        ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("");
      if (userText) {
        await saveChatMessage({
          userId,
          role: "user",
          content: userText,
        });
      }
    }

    console.log(
      `[Chat] userId=${userId}, messages=${messages.length}, toolParts=${messages.filter((m) => m.parts?.some((p) => p.type === "dynamic-tool" || (typeof p.type === "string" && p.type.startsWith("tool-")))).length} msgs with tools`
    );

    const modelMessages = await convertToModelMessages(messages, {
      ignoreIncompleteToolCalls: true,
    });

    console.log(`[Chat] modelMessages=${modelMessages.length}`);

    const result = streamText({
      model,
      system: {
        role: "system",
        content: systemPrompt,
        providerOptions: {
          anthropic: { cacheControl: { type: "ephemeral" } },
        },
      },
      messages: modelMessages,
      tools,
      stopWhen: stepCountIs(10),
      onFinish: async ({ text, usage, steps }) => {
        const toolsSummary = steps
          .flatMap((s) => s.toolCalls.map((tc) => tc.toolName))
          .join(", ");
        console.log(
          `[Chat] onFinish: steps=${steps.length}, tools=[${toolsSummary}], textLen=${text?.length ?? 0}, tokens=${usage?.inputTokens ?? 0}in/${usage?.outputTokens ?? 0}out`
        );

        // Build full UIMessage parts from steps (text + tool calls)
        // so the AI can see its own actions when history is reloaded.
        // step-start markers allow convertToModelMessages to properly
        // reconstruct multi-step tool exchanges.
        const parts: unknown[] = [];
        try {
          for (const step of steps) {
            parts.push({ type: "step-start" });
            for (const tc of step.toolCalls) {
              const tr = step.toolResults.find(
                (r) => r.toolCallId === tc.toolCallId
              );
              // Only save tool calls that have a completed result
              if (tr) {
                parts.push({
                  type: "dynamic-tool",
                  toolCallId: tc.toolCallId,
                  toolName: tc.toolName,
                  input: tc.input,
                  state: "output-available",
                  output: tr.output ?? null,
                });
              }
            }
            if (step.text) {
              parts.push({ type: "text", text: step.text });
            }
          }

          if (text || parts.length > 0) {
            await saveChatMessage({
              userId,
              role: "assistant",
              content: text || "",
              parts:
                parts.length > 0
                  ? (parts as unknown as Prisma.InputJsonValue)
                  : undefined,
            });
          }
        } catch (error) {
          console.error("Failed to save assistant message:", error);
        }

        // Track token usage and estimated cost per user
        try {
          if (usage) {
            const inputTokens = usage.inputTokens ?? 0;
            const outputTokens = usage.outputTokens ?? 0;
            const cacheReadTokens =
              usage.inputTokenDetails?.cacheReadTokens ?? 0;
            const cacheWriteTokens =
              usage.inputTokenDetails?.cacheWriteTokens ?? 0;

            const inputRate = 3; // Sonnet $/M tokens
            const outputRate = 15;
            const estimatedCost =
              ((inputTokens - cacheReadTokens) * inputRate +
                cacheReadTokens * 0.3 +
                cacheWriteTokens * 3.75 +
                outputTokens * outputRate) /
              1_000_000;

            captureServerEvent(userId, "ai_chat_usage", {
              input_tokens: inputTokens,
              output_tokens: outputTokens,
              total_tokens: inputTokens + outputTokens,
              cache_read_tokens: cacheReadTokens,
              cache_write_tokens: cacheWriteTokens,
              estimated_cost_usd: Math.round(estimatedCost * 10000) / 10000,
              step_count: steps.length,
            });
          }
        } catch {
          // PostHog tracking failure is non-critical
        }
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    return errorHandler(error);
  }
}
