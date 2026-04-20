import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { streamText, UIMessage, convertToModelMessages, stepCountIs } from "ai";
import { reasoningModel, executionModel } from "@/lib/ai/provider";
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

    const { messages }: { messages: UIMessage[] } = await req.json();

    // Build system prompt from user data
    const systemPrompt = buildSystemPrompt({
      name: user?.name ?? "User",
      timezone: user?.timezone ?? null,
      onboardingRole: user?.onboardingRole ?? null,
      onboardingNiche: user?.onboardingNiche ?? null,
      onboardingTopics: user?.onboardingTopics ?? [],
      planId: subscription?.planId ?? "starter",
      accounts: lateProfile.socialAccounts,
    });

    // Create tools with user's scoped API key and account mappings
    const tools = createZernioTools(
      lateProfile.lateApiKey,
      lateProfile.lateProfileId,
      lateProfile.socialAccounts,
      user?.timezone ?? "UTC"
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

    const modelMessages = await convertToModelMessages(messages);

    const result = streamText({
      model: reasoningModel,
      system: {
        role: "system",
        content: systemPrompt,
        providerOptions: {
          anthropic: { cacheControl: { type: "ephemeral" } },
        },
      },
      messages: modelMessages,
      tools,
      prepareStep: ({ stepNumber }) => {
        // Step 0: Sonnet for reasoning, content creation, tool decisions
        // Step 1+: Haiku for processing tool results and follow-up calls
        if (stepNumber > 0) {
          return { model: executionModel };
        }
        return {};
      },
      stopWhen: stepCountIs(25),
      onFinish: async ({ text, usage, steps }) => {
        if (text) {
          await saveChatMessage({
            userId,
            role: "assistant",
            content: text,
          });
        }

        // Track token usage and estimated cost per user
        if (usage) {
          const inputTokens = usage.inputTokens ?? 0;
          const outputTokens = usage.outputTokens ?? 0;
          const cacheReadTokens =
            usage.inputTokenDetails?.cacheReadTokens ?? 0;
          const cacheWriteTokens =
            usage.inputTokenDetails?.cacheWriteTokens ?? 0;

          // Compute cost from per-step usage (step 0 = Sonnet, step 1+ = Haiku)
          let estimatedCost = 0;
          for (let i = 0; i < steps.length; i++) {
            const s = steps[i];
            const isSonnet = i === 0;
            const inputRate = isSonnet ? 3 : 1; // $/M tokens
            const outputRate = isSonnet ? 15 : 5;
            estimatedCost +=
              ((s.usage.inputTokens ?? 0) * inputRate +
                (s.usage.outputTokens ?? 0) * outputRate) /
              1_000_000;
          }

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
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    return errorHandler(error);
  }
}
