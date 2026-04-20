import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";

export async function saveChatMessage({
  userId,
  role,
  content,
  parts,
}: {
  userId: string;
  role: "user" | "assistant";
  content: string;
  parts?: Prisma.InputJsonValue;
}) {
  return prisma.chatMessage.create({
    data: {
      userId,
      role,
      content,
      ...(parts !== undefined && { parts }),
    },
  });
}

export async function getChatHistory({
  userId,
  limit = 5,
  cursor,
}: {
  userId: string;
  limit?: number;
  cursor?: string;
}) {
  const messages = await prisma.chatMessage.findMany({
    where: {
      userId,
      ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
  });

  const hasMore = messages.length > limit;
  if (hasMore) messages.pop();

  // Reverse so messages are in chronological order
  messages.reverse();

  return {
    messages,
    hasMore,
    nextCursor: hasMore ? messages[0].createdAt.toISOString() : undefined,
  };
}
