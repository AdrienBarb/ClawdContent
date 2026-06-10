/** Human cadence phrase from a posts-per-week number (LLM-authored, unbounded). */
export function cadencePhrase(postsPerWeek: number): string {
  const n = Math.round(postsPerWeek);
  if (n <= 0) return "A steady rhythm";
  if (n === 1) return "Once a week";
  return `${n}× a week`;
}
