import { prisma } from "@/lib/db/prisma";

export const SUGGESTIONS_COOLDOWN_MS = 30_000;

/**
 * Atomic check-and-claim cooldown for suggestion generation.
 *
 * Returns null if the slot was claimed (caller may proceed). Returns the
 * remaining cooldown in milliseconds otherwise. Uses a conditional updateMany
 * so two concurrent requests can't both claim the slot.
 */
export async function claimSuggestionsCooldown(
  userId: string
): Promise<number | null> {
  const cutoff = new Date(Date.now() - SUGGESTIONS_COOLDOWN_MS);
  const result = await prisma.user.updateMany({
    where: {
      id: userId,
      OR: [
        { lastSuggestionsGeneratedAt: null },
        { lastSuggestionsGeneratedAt: { lt: cutoff } },
      ],
    },
    data: { lastSuggestionsGeneratedAt: new Date() },
  });

  if (result.count > 0) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lastSuggestionsGeneratedAt: true },
  });
  if (!user?.lastSuggestionsGeneratedAt) return null;

  const elapsed = Date.now() - user.lastSuggestionsGeneratedAt.getTime();
  return Math.max(0, SUGGESTIONS_COOLDOWN_MS - elapsed);
}
