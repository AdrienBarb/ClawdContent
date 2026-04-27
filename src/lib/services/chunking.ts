/**
 * Generation chunking — splits a large target count (e.g. 28 Twitter posts
 * for a week) into smaller LLM calls run in parallel. Two reasons:
 *
 * 1. Quality: Sonnet's output gets repetitive and lazy past ~10 items in a
 *    single array. Five at a time stays sharp.
 * 2. Latency: 4 chunks in parallel finish in ~the same wall-time as one
 *    chunk, so a 28-post batch lands in ~10s instead of ~50s.
 *
 * Each chunk gets a different "theme angle" (announcements, BTS, tips, etc.)
 * so the merged batch reads as a varied week, not 28 attempts at the same
 * idea.
 */

export const POSTS_PER_CHUNK = 5;

// TODO: platform-aware themes. Twitter and LinkedIn read very differently for
// the same angle (e.g. "behind-the-scenes" → punchy thread vs. multi-paragraph
// reflection), so a single shared list is suboptimal. Thread `platform`
// through `themeForChunk` and let `platformConfig.ts` override per platform.
export const CHUNK_THEMES = [
  "announcements, news, what's happening right now — be the headline",
  "behind-the-scenes, process, the human side — show how it gets made",
  "tips, education, useful insight — give the audience something to keep",
  "social proof, customer stories, testimonials — borrow trust",
  "calls-to-action, invitations, gentle asks — drive the next step",
  "hot takes, opinions, perspective — be memorable and spark conversation",
  "questions, polls, community engagement — open a loop",
];

/**
 * Split a target count into chunk sizes of at most POSTS_PER_CHUNK.
 * Example: 14 → [5, 5, 4]; 7 → [5, 2]; 3 → [3].
 */
export function planChunks(count: number): number[] {
  if (count <= 0) return [];
  const sizes: number[] = [];
  let remaining = count;
  while (remaining > 0) {
    sizes.push(Math.min(POSTS_PER_CHUNK, remaining));
    remaining -= POSTS_PER_CHUNK;
  }
  return sizes;
}

/**
 * Theme assigned to a given chunk. Returns undefined for single-chunk batches
 * (no need to bias the only call toward one angle).
 */
export function themeForChunk(
  chunkIndex: number,
  totalChunks: number
): string | undefined {
  if (totalChunks <= 1) return undefined;
  return CHUNK_THEMES[chunkIndex % CHUNK_THEMES.length];
}
