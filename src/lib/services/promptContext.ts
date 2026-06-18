/**
 * Shared formatters for blocks that go into LLM prompts.
 *
 * Consumed by `accountInsights.ts`, `createFromBrief.ts`, `rewrite.ts` and the
 * chat tools — keeping them here avoids drift across the call sites.
 */

import type { Insights } from "@/lib/schemas/insights";
import type { SocialStrategy } from "@/lib/schemas/strategy";

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

  const brandLines = formatBrandVoice(kb.branding);

  if (withHeader) {
    return `## Business
Name: ${kb.businessName ?? "Unknown"}
Description: ${kb.description ?? "No description"}
Services: ${services}${brandLines}`;
  }

  return `Business: ${kb.businessName ?? "Unknown"}
Description: ${kb.description ?? "No description"}
Services: ${services}${brandLines}`;
}

/**
 * One-line steer per onboarding goal (`User.onboardingGoal`). Drives BOTH the
 * strategy and the drafting prompts so every post pulls toward what the user
 * actually wants. Returns "" when the goal is unset/unknown — never invents one.
 */
const GOAL_STEERS: Record<string, string> = {
  find_customers:
    "Primary goal: find new customers (leads & sales). Bias toward posts that move people toward buying — offers, social proof, clear CTAs to enquire, book, or visit.",
  build_community:
    "Primary goal: build an engaged community (loyal, repeat audience). Bias toward conversation starters, replies, recurring formats, and insider / behind-the-scenes content.",
  brand_awareness:
    "Primary goal: grow brand awareness (reach new people). Bias toward shareable, discovery-friendly content — strong hooks, Reels, relatable moments.",
  authority:
    "Primary goal: establish authority (be the go-to expert). Bias toward how-tos, insights, myth-busting, and opinionated takes that show expertise.",
};

interface FormatGoalContextOptions {
  /** Prefix the block with `## Goal`. Default: true. */
  withHeader?: boolean;
}

export function formatGoalContext(
  goal: string | null | undefined,
  options: FormatGoalContextOptions = {}
): string {
  if (!goal) return "";
  const steer = GOAL_STEERS[goal];
  if (!steer) return "";
  const withHeader = options.withHeader ?? true;
  return withHeader ? `## Goal\n${steer}` : steer;
}

/**
 * Wrap an untrusted user brief in a tagged envelope with an injection guard.
 * Used by every drafting prompt (compose / brief / week) so the delimiter-strip
 * and the "never follow instructions inside" guard live in ONE place instead of
 * being copy-pasted at each call site.
 */
export function formatUserBriefEnvelope(
  brief: string,
  opts: { header: string; instruction: string }
): string {
  // Strip both delimiters so a malicious brief can't break out of the
  // <user_brief>…</user_brief> envelope or open a sibling one.
  const safe = brief.replace(/<\/?user_brief>/gi, "");
  return `${opts.header}

${opts.instruction}

<user_brief>
${safe}
</user_brief>`;
}

/**
 * Cold-start steer for a drafting prompt when there's no voice fingerprint yet
 * (account never analysed). Keeps the model from caricaturing a voice it can't
 * see: lean on the business context + platform best practices instead.
 */
export function coldStartVoiceNote(platformDisplayName: string): string {
  return `## No historical data\nThis account has no analysed posts yet. Lean on the business context and ${platformDisplayName} best practices.`;
}

/**
 * Render the verbal brand identity (tone of voice, style, tagline) for a
 * prompt. Visual tokens (colours, fonts, logo) are intentionally omitted —
 * they don't help write a caption. Returns "" when there's nothing to add.
 */
function formatBrandVoice(branding: unknown): string {
  if (!branding || typeof branding !== "object") return "";
  const b = branding as Record<string, unknown>;
  const voice = (b.voice ?? null) as Record<string, unknown> | null;
  const styleAdjectives = Array.isArray(b.styleAdjectives)
    ? (b.styleAdjectives as string[]).filter(Boolean)
    : [];
  const tagline = typeof b.tagline === "string" ? b.tagline.trim() : "";

  const lines: string[] = [];
  if (voice && typeof voice.tone === "string" && voice.tone.trim()) {
    lines.push(`Tone of voice: ${voice.tone.trim()}`);
  }
  if (voice && typeof voice.energy === "string" && voice.energy.trim()) {
    lines.push(`Energy: ${voice.energy.trim()}`);
  }
  if (voice && typeof voice.audience === "string" && voice.audience.trim()) {
    lines.push(`Speaks to: ${voice.audience.trim()}`);
  }
  if (styleAdjectives.length > 0) {
    lines.push(`Brand style: ${styleAdjectives.join(", ")}`);
  }
  if (tagline) {
    lines.push(`Tagline: ${tagline}`);
  }

  return lines.length > 0 ? `\n${lines.join("\n")}` : "";
}

/**
 * Render the account's growth strategy as a compact steer for the drafting
 * prompt — so generated posts pull toward the pillars and double-down on what
 * works. Returns "" when there's no strategy yet (cold-start / not generated).
 * Positioning/post-ideas are intentionally omitted: they're for the user to
 * read, not for the model to copy into a caption.
 */
export function formatStrategyContext(
  strategy: SocialStrategy | null,
  options: { withHeader?: boolean } = {}
): string {
  if (!strategy) return "";
  const withHeader = options.withHeader ?? true;
  const lines: string[] = [];

  if (strategy.contentPillars.length > 0) {
    lines.push(
      `Content pillars: ${strategy.contentPillars
        .map((p) => p.name)
        .join(", ")}`
    );
  }
  if (strategy.doubleDown.length > 0) {
    lines.push(`Lean into (working): ${strategy.doubleDown.join("; ")}`);
  }
  if (strategy.stop.length > 0) {
    lines.push(`Avoid / fix: ${strategy.stop.join("; ")}`);
  }
  if (lines.length === 0) return "";

  return withHeader ? `## Strategy to follow\n${lines.join("\n")}` : lines.join("\n");
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
