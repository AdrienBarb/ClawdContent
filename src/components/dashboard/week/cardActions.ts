/**
 * The lifecycle action a week post-card exposes, decided purely by the
 * publishing mode (NOT the post's status):
 *
 *   • "Publish automatically" (full_auto) → the post goes out on its own; the
 *     only lifecycle action is Remove.
 *   • "Approve first" (review)            → a not-yet-committed post waits for
 *     the user's go-ahead, so it also shows Approve. A post already committed
 *     to the schedule has nothing left to approve → Remove only.
 *
 * Remove is always available on an unpublished card, so the only mode-driven
 * decision is whether to show Approve. (Caption / visual editing is always
 * available regardless — those are content edits, not lifecycle actions.)
 */
export type AutopilotMode = "full_auto" | "review";

export function showApproveAction(
  mode: AutopilotMode,
  isCommitted: boolean
): boolean {
  return mode === "review" && !isCommitted;
}
