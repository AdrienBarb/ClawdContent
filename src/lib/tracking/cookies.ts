// Client-safe tracking cookie helpers. This module must NOT import next/headers
// (or anything server-only) so it can be used from client components too.

export const DISTINCT_ID_COOKIE = "postclaw_distinct_id";

/**
 * Read a cookie value in the browser. Returns undefined on the server (no
 * document) or when the cookie is absent.
 */
export function readClientCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  // Escape regex metacharacters so an unusual cookie name can't break the match.
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}
