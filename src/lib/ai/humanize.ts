// Last-mile cleanup of AI-generated post bodies before they hit the DB.
// The prompt rules in humanRules.ts forbid these patterns, but the model
// still slips occasionally. Conservative on purpose: false positives
// (mangling user-typed content) are worse than the odd em-dash leaking
// through.

// Only replace em-/en-dashes that have whitespace on at least one side —
// the AI-tell pattern is "X — Y" (sentence punctuation), not "Self—Care"
// or "https://foo—bar.com" (intra-token). Replacing intra-token dashes
// would corrupt URLs, hashtags, and brand names.
function stripDashes(text: string): string {
  return text
    .replace(/[ \t]+[—–][ \t]*/g, ", ")
    .replace(/[—–][ \t]+/g, ", ");
}

// Two or more pictographic chars (with optional whitespace between them)
// at the very end of the post — a "signoff sparkle" cluster. Single
// trailing emoji is preserved because it's often part of the user's
// voice. Each iteration of the group must consume a pictographic, so a
// lone emoji can't satisfy {2,}.
const TRAILING_EMOJI_CLUSTER = /\p{Extended_Pictographic}(?:\s*\p{Extended_Pictographic})+\s*$/u;

function stripTrailingEmojiCluster(text: string): string {
  return text.replace(TRAILING_EMOJI_CLUSTER, "").trimEnd();
}

function normalizeWhitespace(text: string): string {
  return text
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Drop the final line if it duplicates an earlier line (case-insensitive,
// stripped of trailing punctuation/emoji). Catches AI sign-offs that
// echo the hook ("Let's connect!" appearing twice). Requires ≥ 4 lines
// so 3-line refrain patterns survive.
function collapseDuplicateClosingLine(text: string): string {
  const lines = text.split("\n").map((l) => l.trimEnd());
  if (lines.length < 4) return text;

  let lastNonEmptyIndex = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trim().length > 0) {
      lastNonEmptyIndex = i;
      break;
    }
  }
  if (lastNonEmptyIndex <= 0) return text;

  const norm = (s: string) =>
    s.trim().toLowerCase().replace(/[\p{P}\p{Extended_Pictographic}\s]+$/gu, "");

  const closing = norm(lines[lastNonEmptyIndex]);
  if (closing.length === 0 || closing.length > 60) return text;

  const earlierIndex = lines.findIndex(
    (line, i) => i < lastNonEmptyIndex && norm(line) === closing,
  );
  if (earlierIndex === -1) return text;

  lines.splice(lastNonEmptyIndex, 1);
  return lines.join("\n").trimEnd();
}

export function humanizeContent(text: string): string {
  if (!text) return text;
  let out = text;
  out = stripDashes(out);
  // Collapse before stripping trailing emoji so a duplicate line ending in
  // its own emoji cluster gets cleaned in one pass.
  out = collapseDuplicateClosingLine(out);
  out = stripTrailingEmojiCluster(out);
  out = normalizeWhitespace(out);
  return out;
}
