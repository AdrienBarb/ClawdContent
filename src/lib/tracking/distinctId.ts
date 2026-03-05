import { cookies } from "next/headers";

export const DISTINCT_ID_COOKIE = "postclaw_distinct_id";

/**
 * Read the anonymous distinct ID from the cookie store (server components / route handlers).
 */
export async function getDistinctId(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(DISTINCT_ID_COOKIE)?.value;
}

/**
 * Extract the anonymous distinct ID from a raw Cookie header string (e.g. in auth hooks).
 */
export function getDistinctIdFromHeader(cookieHeader: string): string | undefined {
  const match = cookieHeader.match(
    new RegExp(`${DISTINCT_ID_COOKIE}=([^;]+)`)
  );
  return match?.[1];
}
