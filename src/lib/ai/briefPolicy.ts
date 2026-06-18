/**
 * Canonical policy for when a `generate_posts` brief is ready to draft from vs.
 * needs a clarifying question first. Embedded verbatim in BOTH the chat system
 * prompt (turn-level orchestration guidance) and the `generate_posts` tool
 * description (call-time precondition), so the rule can't drift between the two
 * surfaces — change it here and both update.
 */
export const GENERATE_POSTS_BRIEF_POLICY = `Classify the brief before drafting:
- Concrete — names a specific topic / product / event / angle. Draft directly.
- Self-contained generic — e.g. "introduce my business", "a behind-the-scenes post", "plan my week", "a post for today's day of the week". Draft directly; the business context is enough.
- Underspecified — depends on a fact only the user knows but hasn't stated. Examples: "a post about today" (you don't know what's happening at their business), "announce an event" (which event? when?), "highlight a service" when several are plausible (which one?), "launch a new service" (what? when?), "recent news" (what news?). For these, ask ONE short, specific question first (offer 3-5 short tap-back options when it helps) and do not draft until the missing fact is in the conversation.`;
