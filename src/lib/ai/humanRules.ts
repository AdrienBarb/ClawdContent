// Phrases / words that pattern-match AI marketing prose. Kept short and
// high-signal — over-banning creates a different unnatural voice.
export const BANNED_PHRASES = [
  "delve",
  "delving",
  "elevate",
  "elevating",
  "unlock",
  "unleash",
  "transformative",
  "transform your",
  "revolutionary",
  "revolutionize",
  "game-changer",
  "game-changing",
  "level up",
  "next level",
  "in today's fast-paced world",
  "in today's digital age",
  "in the ever-evolving",
  "let's dive in",
  "dive deep",
  "harness the power",
  "embark on",
  "embark on a journey",
  "curated",
  "tapestry",
  "treasure trove",
  "navigate the",
  "stand out from the crowd",
  "leverage",
  "synergy",
  "supercharge",
  "boost your",
  "skyrocket",
  "groundbreaking",
  "cutting-edge",
  "in essence",
  "ultimately",
  "moreover",
  "furthermore",
  "in conclusion",
] as const;

export const STRUCTURAL_RULES = [
  "No em-dashes (—) or en-dashes (–). Use a comma, period, or parentheses instead.",
  "Use contractions (it's, you're, don't, we're) — full forms read robotic.",
  "Mix sentence length on purpose. Pair a short sentence (3–7 words) with a longer one (15–25 words). Avoid paragraphs of three near-identical sentences.",
  "Never start three sentences in a row with the same word.",
  "No tricolons / rule-of-three lists (\"X, Y, and Z\") more than once per post.",
  "Drop transition words at the start of sentences: \"Moreover\", \"Furthermore\", \"In essence\", \"Ultimately\", \"In conclusion\".",
  "Don't bookend with a tagline like \"Let's connect!\" or \"Stay tuned!\" unless that's clearly part of the user's existing voice.",
  "It's okay to be slightly imperfect — a sentence fragment, a casual aside, an everyday word. Sounds human, not polished.",
  "No exclamation marks unless the user's voice samples actually use them.",
  "No emoji unless the voice fingerprint shows the user uses them. If used, max 1–2 per post.",
] as const;

export function buildHumanRulesBlock(): string {
  const banned = BANNED_PHRASES.map((p) => `"${p}"`).join(", ");
  const structural = STRUCTURAL_RULES.map((r, i) => `${i + 1}. ${r}`).join("\n");

  return `## Sound human, not AI

These rules apply to every word you write. They override any instinct toward polished marketing prose — small business owners don't talk like LinkedIn ghostwriters.

**Banned phrases (never use these or close variants):** ${banned}.

**Structural rules:**
${structural}

If a rule conflicts with the user's existing voice fingerprint, follow the voice fingerprint — those samples are how this person actually writes.`;
}

// Tighter than the SDK default (temperature 1.0). Lower temperature gives
// the model room to vary structure and word choice without producing the
// over-balanced "marketing prose" tics this prompt explicitly bans.
// Anthropic recommends setting either temperature OR top_p, not both,
// so we only set temperature.
export const HUMAN_SAMPLING = {
  temperature: 0.85,
} as const;
