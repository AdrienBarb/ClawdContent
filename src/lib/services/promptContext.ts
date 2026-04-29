/**
 * Shared formatters for blocks that go into LLM prompts.
 *
 * Consumed by `accountInsights.ts`, `createFromBrief.ts`, `rewrite.ts` and the
 * chat tools — keeping them here avoids drift across the call sites.
 */

import type { Insights } from "@/lib/schemas/insights";

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

interface FormatVoiceFingerprintOptions {
  /** Prefix the block with `## Voice fingerprint`. Default: true. */
  withHeader?: boolean;
  /** How many top-performing posts to include as tone anchors. Default: 2. */
  topPostsCount?: number;
  /** How many extracted hashtags to include. Default: 8. */
  hashtagsCount?: number;
}

/**
 * Render the user's voice fingerprint for an LLM prompt.
 *
 * Returns `null` when there's nothing to fingerprint (insights missing, or
 * `meta.postsAnalyzed === 0`). The kill criterion: no caricature on cold-start.
 *
 * Note: cross-platform borrowing already happens upstream in `accountInsights`,
 * so a cold-start account may still have a populated `inferred` zone with
 * `meta.voiceBorrowedFromPlatform` set — we surface that as a hint.
 */
export function formatVoiceFingerprint(
  insights: Insights | null,
  options: FormatVoiceFingerprintOptions = {}
): string | null {
  if (!insights || insights.meta.postsAnalyzed === 0) return null;

  const withHeader = options.withHeader ?? true;
  const topPostsCount = options.topPostsCount ?? 2;
  const hashtagsCount = options.hashtagsCount ?? 8;

  const { computed, inferred, zernio, meta } = insights;
  const blocks: string[] = [];

  if (withHeader) {
    blocks.push("## Voice fingerprint (computed from their actual posts)");
  } else {
    blocks.push("Voice fingerprint (computed from their actual posts):");
  }

  // Skip the voiceStats sub-block when the extractor produced all-zeros (image-
  // only history, regex miss). A row of 0s reads to the LLM as "write very
  // short, no emoji, no hashtag" — actively misleading. Inferred/hashtag/top-
  // post sub-blocks come from independent sources and may still be valid.
  if (computed.voiceStats.avgPostLengthChars > 0) {
    blocks.push(`- Average post length: ${computed.voiceStats.avgPostLengthChars} characters
- Posts with emoji: ${Math.round(computed.voiceStats.emojiDensity * 100)}%
- Hashtags per post: ${computed.voiceStats.hashtagsPerPost}
- Posts with a question: ${Math.round(computed.voiceStats.questionFrequency * 100)}%`);
  }

  if (computed.extractedHashtags.length > 0 && hashtagsCount > 0) {
    blocks.push(
      `Hashtags they actually use: ${computed.extractedHashtags
        .slice(0, hashtagsCount)
        .map((h) => `${h.tag} (×${h.uses})`)
        .join(", ")}`
    );
  }

  if (inferred) {
    const lines: string[] = [
      `Tone (${inferred.confidence} confidence): ${inferred.toneSummary}`,
    ];
    if (inferred.topics.length > 0) {
      lines.push(`Topics they cover: ${inferred.topics.join(", ")}`);
    }
    const patterns = inferred.performingPatterns.slice(0, 3);
    if (patterns.length > 0) {
      lines.push(`Patterns that perform: ${patterns.join("; ")}`);
    }
    blocks.push(lines.join("\n"));
  }

  if (topPostsCount > 0 && zernio.topPosts.length > 0) {
    const top = zernio.topPosts.slice(0, topPostsCount);
    const block = top
      .map((p, i) => `Top post ${i + 1}: ${p.content.slice(0, 240)}`)
      .join("\n\n");
    blocks.push(block);
  }

  if (meta.voiceBorrowedFromPlatform) {
    blocks.push(
      `(Voice borrowed from ${meta.voiceBorrowedFromPlatform} — treat as a hint, not a contract.)`
    );
  }

  return blocks.join("\n\n");
}
