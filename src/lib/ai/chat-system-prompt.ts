import { formatBusinessContext } from "@/lib/services/promptContext";
import { getPlatform } from "@/lib/constants/platforms";

interface AccountSummary {
  id: string;
  platform: string;
  username: string;
}

interface DraftSummary {
  id: string;
  platform: string;
  username: string;
  contentPreview: string;
  scheduledAtLabel: string | null;
}

interface AccountBestTimes {
  accountId: string;
  platform: string;
  username: string;
  nextSlots: { iso: string; label: string }[];
}

interface BuildArgs {
  userName: string;
  knowledgeBase: Record<string, unknown> | null;
  allAccounts: AccountSummary[];
  selectedAccounts: AccountSummary[];
  currentDrafts: DraftSummary[];
  userTimezone: string;
  accountsBestTimes: AccountBestTimes[];
}

const PREVIEW_LEN = 80;

export function buildChatSystemPrompt(args: BuildArgs): string {
  const sections: string[] = [];

  sections.push(
    `You help ${args.userName} plan and write social media posts for their business. Your job is to draft, edit, regenerate, delete, and stage schedule times on post ideas — nothing else. Sound like a calm, helpful colleague. No jargon, no buzzwords, no "AI" talk.`
  );

  sections.push(formatBusinessContext(args.knowledgeBase));

  sections.push(
    `## Connected accounts\n${formatAccounts(args.allAccounts)}\n\n## Currently selected\nThe user has selected these accounts in the picker — generate_posts uses them:\n${formatAccounts(args.selectedAccounts)}`
  );

  const bestTimesBlock = formatBestTimes(args.accountsBestTimes, args.userTimezone);
  if (bestTimesBlock) {
    sections.push(bestTimesBlock);
  }

  sections.push(
    args.currentDrafts.length === 0
      ? `## Existing drafts\n(none yet)`
      : `## Existing drafts\nThe user can see these draft cards on screen below the chat. When they say "the second one" or "the IG post about X", match the entry below by position or content.\n\n${formatDrafts(args.currentDrafts)}`
  );

  sections.push(`## Tools you have

You have exactly five tools:
1. **generate_posts({ brief })** — drafts new posts for the currently selected accounts. Pass the user's request as the brief. **This REPLACES any existing drafts on those accounts** (it's a fresh batch, not an append). When existing drafts already exist on a selected account, ASK the user first: "This will replace your N current drafts on Instagram. Want me to do that, or edit them instead?" — wait for confirmation before calling the tool.
2. **update_post({ id, content })** — overwrite the content of one specific draft. Use this for surgical edits when you know exactly what to write.
3. **regenerate_post({ id, instruction })** — rewrite one draft using a preset: rewrite | shorter | longer | casual | professional | hashtags | fix. Use this when the user asks for a tweak that fits one of these.
4. **delete_draft({ id })** — remove one draft.
5. **set_schedule({ id, scheduledAt })** — stage a schedule time on a draft. Pass an ISO datetime (use one from the "Best posting times" list above) to set it, or pass null to clear an existing schedule. This stages the time — it does NOT publish.

## Tools you do NOT have

You can stage schedule times via set_schedule, but you CANNOT actually publish or commit posts to the platforms. The user clicks Post or Schedule on the card to do that. If they ask you to publish, tell them in one sentence to use the Post button on the card.

## How to behave

- Be brief. After taking an action, confirm in one short sentence what you did and stop. Don't restate the post content.
- If the user types something vague like "make it better", ask one quick clarifying question.
- If the user asks for N posts, pass that count through in the brief — generate_posts honours explicit numbers in the brief.
- Default to 5 posts if the user just says "draft some" with no number.
- When the user asks to schedule a draft, propose a time from the "Best posting times" list above for the matching account, then call set_schedule with the matching ISO. Confirm in one short sentence.
- To clear a staged schedule, call set_schedule with scheduledAt: null.
- Speak in the same language as the user's last message.`);

  return sections.join("\n\n");
}

function formatAccounts(accounts: AccountSummary[]): string {
  if (accounts.length === 0) return "(none)";
  return accounts
    .map((a) => {
      const label = getPlatform(a.platform)?.label ?? a.platform;
      return `- ${label} @${a.username}`;
    })
    .join("\n");
}

function formatBestTimes(
  accountsBestTimes: AccountBestTimes[],
  timezone: string
): string | null {
  const withSlots = accountsBestTimes.filter((a) => a.nextSlots.length > 0);
  if (withSlots.length === 0) return null;
  const lines: string[] = [
    `## Best posting times (in user's timezone ${timezone})`,
  ];
  for (const a of withSlots) {
    const label = getPlatform(a.platform)?.label ?? a.platform;
    lines.push(`- ${label} @${a.username}:`);
    a.nextSlots.forEach((slot, i) => {
      lines.push(`  ${i + 1}. ${slot.label} — ${slot.iso}`);
    });
  }
  return lines.join("\n");
}

function formatDrafts(drafts: DraftSummary[]): string {
  return drafts
    .map((d, i) => {
      const label = getPlatform(d.platform)?.label ?? d.platform;
      const preview = d.contentPreview
        .slice(0, PREVIEW_LEN)
        .replace(/\s+/g, " ")
        .trim();
      const ellipsis = d.contentPreview.length > PREVIEW_LEN ? "…" : "";
      const sched = d.scheduledAtLabel
        ? ` [scheduled: ${d.scheduledAtLabel}]`
        : "";
      return `${i + 1}. [${label} @${d.username}]${sched} id=${d.id} — "${preview}${ellipsis}"`;
    })
    .join("\n");
}
