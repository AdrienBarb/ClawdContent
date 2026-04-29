/**
 * Shared formatters for blocks that go into LLM prompts.
 *
 * Consumed by `accountInsights.ts` and `createFromBrief.ts` — keeping them
 * here avoids drift across the call sites.
 */

interface FormatBusinessContextOptions {
  /** Prefix the block with `## Business`. Default: true. */
  withHeader?: boolean;
}

export function formatBusinessContext(
  kb: Record<string, unknown> | null,
  options: FormatBusinessContextOptions = {}
): string {
  const withHeader = options.withHeader ?? true;

  if (!kb) {
    return withHeader
      ? "## Business\nNo business info available."
      : "No business info available.";
  }

  const services = Array.isArray(kb.services)
    ? (kb.services as string[]).join(", ")
    : "Not specified";

  if (withHeader) {
    return `## Business
Name: ${kb.businessName ?? "Unknown"}
Description: ${kb.description ?? "No description"}
Services: ${services}`;
  }

  return `Business: ${kb.businessName ?? "Unknown"}
Description: ${kb.description ?? "No description"}
Services: ${services}`;
}
