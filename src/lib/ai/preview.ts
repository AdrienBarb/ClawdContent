/**
 * Single source of truth for the short preview snippets used in chat tool
 * results, the system-prompt draft list, and the route's tool-call logger.
 * Keeping this in one place means future tweaks (length, ellipsis style)
 * stay consistent across all surfaces.
 */
export const PREVIEW_LEN = 80;

export function preview(text: string, len = PREVIEW_LEN): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  return cleaned.length > len ? `${cleaned.slice(0, len)}…` : cleaned;
}
