import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";

export interface UserStrategy {
  goal?: string;
  audience?: string;
  angle?: string;
  contentPillars?: string[];
  voice?: {
    general?: string;
    linkedin?: string;
    twitter?: string;
    instagram?: string;
    threads?: string;
    bluesky?: string;
    facebook?: string;
    tiktok?: string;
    pinterest?: string;
    youtube?: string;
  };
  constraints?: string[];
  updatedAt?: string;
}

/**
 * Deep merge strategy objects.
 * - Scalar fields: new value replaces old
 * - Arrays (contentPillars, constraints): new value replaces old entirely
 * - voice object: merged key by key (setting linkedin doesn't erase twitter)
 */
function mergeStrategy(
  existing: UserStrategy | null,
  partial: UserStrategy
): UserStrategy {
  const base = existing ?? {};
  const merged: UserStrategy = { ...base };

  if (partial.goal !== undefined) merged.goal = partial.goal;
  if (partial.audience !== undefined) merged.audience = partial.audience;
  if (partial.angle !== undefined) merged.angle = partial.angle;
  if (partial.contentPillars !== undefined)
    merged.contentPillars = partial.contentPillars;
  if (partial.constraints !== undefined)
    merged.constraints = partial.constraints;

  if (partial.voice !== undefined) {
    merged.voice = { ...(base.voice ?? {}), ...partial.voice };
  }

  merged.updatedAt = new Date().toISOString();

  return merged;
}

export async function updateUserStrategy(
  userId: string,
  partial: UserStrategy
): Promise<UserStrategy> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { strategy: true },
  });

  const existing = (user.strategy as UserStrategy | null) ?? null;
  const merged = mergeStrategy(existing, partial);

  await prisma.user.update({
    where: { id: userId },
    data: { strategy: merged as unknown as Prisma.InputJsonValue },
  });

  return merged;
}
