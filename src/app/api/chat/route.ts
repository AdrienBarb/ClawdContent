import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  type UIMessage,
} from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import {
  buildChatSystemPrompt,
  type OutcomesContext,
} from "@/lib/ai/chat-system-prompt";
import { createChatTools } from "@/lib/ai/chat-tools";
import { preview } from "@/lib/ai/preview";
import { getBestSlots } from "@/lib/services/bestTimes";
import { limitChat } from "@/lib/rateLimit/chatLimiter";

// /generate-objects calls under generate_posts can take 90–120s for the
// slowest account chunk. 240 leaves comfortable headroom (Vercel Pro max 300).
export const maxDuration = 240;

const bodySchema = z.object({
  messages: z.array(z.unknown()).min(1),
  accountIds: z
    .array(z.string().min(1))
    .min(1)
    .max(10)
    .refine((arr) => new Set(arr).size === arr.length, {
      message: "Duplicate accountIds are not allowed",
    }),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json(
        { error: errorMessages.UNAUTHORIZED },
        { status: 401 }
      );
    }
    const userId = session.user.id;

    // Sliding-window rate limit (20 msg/min). Conversational chat is free
    // (it doesn't debit the usage ledger), so this is the abuse guard.
    const limit = await limitChat(userId);
    if (!limit.success) {
      const retryAfterSec = limit.reset
        ? Math.max(1, Math.ceil((limit.reset - Date.now()) / 1000))
        : 60;
      return NextResponse.json(
        {
          error: "Too many chat messages. Try again in a moment.",
          retryAfterSeconds: retryAfterSec,
        },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfterSec) },
        }
      );
    }

    const raw = await req.json().catch(() => ({}));
    const { messages, accountIds } = bodySchema.parse(raw);

    // Run lateProfile + user + outcomes in parallel — all depend only on userId.
    // currentDrafts has to wait for accountIds validation.
    const [lateProfile, user, outcomeRow] = await Promise.all([
      prisma.lateProfile.findUnique({
        where: { userId },
        include: {
          socialAccounts: {
            where: { status: "active" },
            select: {
              id: true,
              platform: true,
              username: true,
              insights: true,
            },
          },
        },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, knowledgeBase: true, timezone: true },
      }),
      prisma.outcomeSnapshot.findUnique({
        where: { userId },
        select: {
          publishedCount: true,
          topPerformers: true,
          underperformers: true,
          patterns: true,
          failedPosts: true,
        },
      }),
    ]);

    if (!lateProfile || lateProfile.socialAccounts.length === 0) {
      return NextResponse.json(
        { error: "No connected accounts" },
        { status: 400 }
      );
    }

    const ownedIds = new Set(lateProfile.socialAccounts.map((a) => a.id));
    const validSelectedIds = accountIds.filter((id) => ownedIds.has(id));
    if (validSelectedIds.length !== accountIds.length) {
      return NextResponse.json(
        { error: "One or more accounts not found or not owned by user" },
        { status: 403 }
      );
    }

    const currentDrafts = await prisma.postSuggestion.findMany({
      where: { socialAccountId: { in: validSelectedIds } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        content: true,
        scheduledAt: true,
        socialAccount: { select: { platform: true, username: true } },
      },
    });

    const allAccounts = lateProfile.socialAccounts.map((a) => ({
      id: a.id,
      platform: a.platform,
      username: a.username,
    }));
    const selectedAccounts = allAccounts.filter((a) =>
      validSelectedIds.includes(a.id)
    );

    const userTimezone = user?.timezone ?? "UTC";

    const accountsBestTimes = lateProfile.socialAccounts
      .filter((a) => validSelectedIds.includes(a.id))
      .map((a) => {
        const insightsBestTimes =
          (a.insights as { zernio?: { bestTimes?: unknown[] | null } } | null)
            ?.zernio?.bestTimes ?? null;
        const slots = getBestSlots({
          insightsBestTimes: insightsBestTimes as
            | { dayOfWeek: number; hour: number; avgEngagement?: number }[]
            | null,
          platform: a.platform,
        });
        return {
          accountId: a.id,
          platform: a.platform,
          username: a.username,
          weeklySlots: slots.map((s) => ({ day: s.day, hour: s.hour })),
        };
      });

    const outcomes: OutcomesContext | null = outcomeRow
      ? {
          publishedCount: outcomeRow.publishedCount,
          topPerformers:
            (outcomeRow.topPerformers as unknown as OutcomesContext["topPerformers"]) ??
            [],
          underperformers:
            (outcomeRow.underperformers as unknown as OutcomesContext["underperformers"]) ??
            [],
          patterns:
            (outcomeRow.patterns as unknown as OutcomesContext["patterns"]) ?? {
              bestPlatform: null,
              bestHour: null,
              bestContentType: null,
            },
          failedPosts:
            (outcomeRow.failedPosts as unknown as OutcomesContext["failedPosts"]) ??
            [],
        }
      : null;

    const systemPrompt = buildChatSystemPrompt({
      userName: user?.name ?? "there",
      knowledgeBase:
        (user?.knowledgeBase as Record<string, unknown> | null) ?? null,
      allAccounts,
      selectedAccounts,
      currentDrafts: currentDrafts.map((d) => ({
        id: d.id,
        platform: d.socialAccount.platform,
        username: d.socialAccount.username,
        contentPreview: preview(d.content),
        scheduledAtLabel: d.scheduledAt
          ? d.scheduledAt.toLocaleString("en-US", {
              timeZone: userTimezone,
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })
          : null,
      })),
      userTimezone,
      accountsBestTimes,
      outcomes,
    });

    const tools = createChatTools({ userId, accountIds: validSelectedIds });

    console.log(
      `[chat] userId=${userId} accounts=${validSelectedIds.length} drafts=${currentDrafts.length} messages=${messages.length}`
    );

    const modelMessages = await convertToModelMessages(messages as UIMessage[], {
      ignoreIncompleteToolCalls: true,
    });

    const result = streamText({
      model: anthropic("claude-sonnet-4-6"),
      system: systemPrompt,
      messages: modelMessages,
      tools,
      stopWhen: stepCountIs(6),
      onFinish: ({ text, usage, steps }) => {
        const toolNames = steps
          .flatMap((s) => s.toolCalls.map((tc) => tc.toolName))
          .join(", ");
        console.log(
          `[chat] onFinish steps=${steps.length} tools=[${toolNames}] textLen=${text?.length ?? 0} tokens=${usage?.inputTokens ?? 0}in/${usage?.outputTokens ?? 0}out`
        );
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    return errorHandler(error);
  }
}
