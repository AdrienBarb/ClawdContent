import { cookies } from "next/headers";
import { DISTINCT_ID_COOKIE } from "./cookies";

// Re-exported so server callers keep importing it from here, while client code
// imports it from `./cookies` directly (this module pulls in next/headers).
export { DISTINCT_ID_COOKIE };

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
