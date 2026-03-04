import { prisma } from "@/lib/db/prisma";

export async function saveChatMessage({
  userId,
  role,
  content,
}: {
  userId: string;
  role: "user" | "assistant";
  content: string;
}) {
  return prisma.chatMessage.create({
    data: { userId, role, content },
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
