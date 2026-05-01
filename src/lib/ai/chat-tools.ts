import "server-only";
import { tool } from "ai";
import { z } from "zod";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { prisma } from "@/lib/db/prisma";
import { createFromBrief } from "@/lib/services/createFromBrief";
import { claimSuggestionsCooldown } from "@/lib/services/rateLimit";
import {
  buildEditPrompt,
  buildRewritePrompt,
  rewriteOutputSchema,
} from "@/lib/ai/rewrite";
import { HUMAN_SAMPLING } from "@/lib/ai/humanRules";
import { humanizeContent } from "@/lib/ai/humanize";
import { parseInsights } from "@/lib/services/insightsHelpers";
import {
  consume,
  refund,
  getBalance,
  getBalanceSummary,
} from "@/lib/services/usage";
import { pointsFor, type UsageType } from "@/lib/constants/usage";
import {
  UsageLimitError,
  type UsageLimitPayload,
  type UsageLimitPayloadWire,
} from "@/lib/errors/UsageLimitError";
import { createLogger } from "@/lib/logger";
import {
  publishOrScheduleSuggestion,
  type PublishResult,
} from "@/lib/services/publishSuggestion";
import type { MediaItem } from "@/lib/schemas/mediaItems";

const log = createLogger("usage");

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

type ScheduleIsoValidation =
  | { ok: true; date: Date }
  | { ok: false; error: "invalid_iso" | "in_past" | "too_far"; message: string };

function validateScheduleIso(iso: string): ScheduleIsoValidation {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return {
      ok: false,
      error: "invalid_iso",
      message: "That's not a valid ISO datetime.",
    };
  }
  if (parsed.getTime() <= Date.now()) {
    return {
      ok: false,
      error: "in_past",
      message: "That time has already passed. Pick a future slot.",
    };
  }
  if (parsed.getTime() > Date.now() + ONE_YEAR_MS) {
    return {
      ok: false,
      error: "too_far",
      message: "Pick a time within the next year.",
    };
  }
  return { ok: true, date: parsed };
}

// Wire-shaped paywall payload for the paywall modal. The UI never sees the
// cost or the cap — it only renders the percentage and the resetAt label.
async function buildPaywallPayload(
  userId: string,
  attemptedType: UsageType
): Promise<UsageLimitPayloadWire> {
  const summary = await getBalanceSummary(userId);
  return {
    attemptedType,
    percentageRemaining: summary.percentageRemaining,
    resetAt: summary.resetAt,
    isPaid: summary.isPaid,
  };
}

function toWire(p: UsageLimitPayload): UsageLimitPayloadWire {
  return { ...p, resetAt: p.resetAt ? p.resetAt.toISOString() : null };
}

interface CreateChatToolsArgs {
  userId: string;
  accountIds: string[];
  attachedMediaItems?: MediaItem[];
}

import { preview } from "./preview";

export function createChatTools({
  userId,
  accountIds,
  attachedMediaItems,
}: CreateChatToolsArgs) {
  return {
    generate_posts: tool({
      description:
        "Draft a new batch of post ideas for the currently selected accounts. The brief is the user's request in their own words — pass it through verbatim. This APPENDS to any existing drafts on the selected accounts; existing drafts are kept untouched.\n\n⚠️ Precondition — do NOT call this if the brief depends on facts only the user knows but hasn't stated. Examples of underspecified briefs that REQUIRE one clarifying question first:\n- 'a post about today' / 'what's happening today' (you don't know what's happening at their business)\n- 'announce an event' / 'around an event' (which event? when?)\n- 'highlight a service' when more than one service is plausible from their context (which one?)\n- 'launch a new service' (what service? when?)\n- 'recent news' / 'something that happened' (what news?)\n\nIn those cases, ask ONE short, specific question instead of calling this tool. When reasonable, suggest 3–5 short answer options inline so the user can reply with one tap. Only call generate_posts once the missing fact is in the conversation.\n\nA brief is concrete enough to call this tool when (a) it names a specific topic / product / event / angle, OR (b) it's a self-contained generic ('introduce my business', 'behind the scenes', 'plan my week') that you can fulfill from the business context above.",
      inputSchema: z.object({
        brief: z
          .string()
          .min(1)
          .max(4000)
          .describe(
            "The user's request in their own words. Examples: 'Generate me 5 posts about my Easter menu', 'Plan a week of content for our spring launch'. Faithfully relay what they wrote."
          ),
      }),
      execute: async ({ brief }, { toolCallId }) => {
        console.log(
          `[chat-tool:generate_posts] userId=${userId} accountIds=${accountIds.join(",")} briefLen=${brief.length} mediaCount=${attachedMediaItems?.length ?? 0} toolCallId=${toolCallId}`
        );

        if (accountIds.length === 0) {
          return {
            ok: false as const,
            error: "no_accounts_selected",
            message:
              "No accounts are selected. Ask the user to pick at least one account in the chip selector at the top of the page.",
          };
        }

        // Pre-flight on the unified points pool. Cost: 1 generation = 2
        // points (per account). Three outcomes:
        //   balance < cost-of-one  → hard wall (modal)
        //   balance < cost-of-N    → partial-capacity (Claude degrades)
        //   else                   → proceed
        const balance = await getBalance({ userId });
        const costOne = pointsFor("draft_generation", 1);
        const costAll = pointsFor("draft_generation", accountIds.length);

        log.info(
          `preflight generate_posts userId=${userId} balance=${balance}pts costOne=${costOne}pts requested=${accountIds.length} costAll=${costAll}pts`
        );

        if (balance < costOne) {
          const payload = await buildPaywallPayload(userId, "draft_generation");
          log.warn(
            `generate_posts wall hit userId=${userId} balance=${balance}pts < ${costOne}pts → paywall`
          );
          return {
            ok: false as const,
            error: "usage_limit_reached",
            surface: "paywall_modal",
            payload,
            message: payload.isPaid
              ? `The user has run out of monthly allowance. Offer the Boost pack ($9) or wait until ${payload.resetAt}.`
              : `The user has used their free allowance. Tell them to upgrade to Pro to keep planning posts.`,
          };
        }
        if (balance < costAll) {
          const affordable = Math.floor(balance / costOne);
          log.warn(
            `generate_posts partial userId=${userId} affordable=${affordable}/${accountIds.length} (balance=${balance}pts)`
          );
          return {
            ok: false as const,
            error: "partial_capacity",
            available: affordable,
            requested: accountIds.length,
            message: `The user has only enough allowance for ${affordable} of the ${accountIds.length} selected accounts. Ask them: should you generate for ${affordable} accounts (which ones?) or do they want to grab a Boost pack?`,
          };
        }

        const cooldownMs = await claimSuggestionsCooldown(userId);
        if (cooldownMs !== null) {
          const seconds = Math.ceil(cooldownMs / 1000);
          console.log(
            `[chat-tool:generate_posts] ⏱  cooldown ${seconds}s remaining`
          );
          return {
            ok: false as const,
            error: "cooldown",
            retryAfterSeconds: seconds,
            message: `Wait ${seconds} more second${seconds === 1 ? "" : "s"} before generating again.`,
          };
        }

        try {
          await consume({
            userId,
            type: "draft_generation",
            count: accountIds.length,
            dedupKey: `consume:${toolCallId}`,
            metadata: { accountIds, briefLength: brief.length },
          });
        } catch (err) {
          if (err instanceof UsageLimitError) {
            return {
              ok: false as const,
              error: "usage_limit_reached",
              surface: "paywall_modal",
              payload: toWire(err.payload),
              message: "Out of allowance.",
            };
          }
          throw err;
        }

        try {
          const { suggestions, failedAccountIds } = await createFromBrief({
            userId,
            accountIds,
            brief,
            mediaItems: attachedMediaItems,
          });

          if (failedAccountIds.length > 0) {
            await refund({
              userId,
              type: "draft_generation",
              count: failedAccountIds.length,
              dedupKey: `refund:${toolCallId}:partial`,
              originalConsumeDedupKey: `consume:${toolCallId}`,
              metadata: { failedAccountIds },
            });
          }

          console.log(
            `[chat-tool:generate_posts] ✓ ${suggestions.length} drafts, ${failedAccountIds.length} failed accounts (refunded)`
          );

          return {
            ok: true as const,
            count: suggestions.length,
            failedCount: failedAccountIds.length,
            drafts: suggestions.map((s) => ({
              id: s.id,
              platform: s.socialAccount.platform,
              username: s.socialAccount.username,
              contentPreview: preview(s.content),
            })),
          };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(`[chat-tool:generate_posts] ✗ ${message}`);
          await refund({
            userId,
            type: "draft_generation",
            count: accountIds.length,
            dedupKey: `refund:${toolCallId}:total`,
            originalConsumeDedupKey: `consume:${toolCallId}`,
            metadata: { error: message },
          }).catch((refundErr) => {
            console.error(
              `[chat-tool:generate_posts] ✗ refund failed: ${refundErr instanceof Error ? refundErr.message : refundErr}`
            );
          });
          return {
            ok: false as const,
            error: "generation_failed",
            message: "Couldn't generate posts. Try again in a moment.",
          };
        }
      },
    }),

    update_post: tool({
      description:
        "Apply a free-form edit to one specific draft. Pass the user's request in their own words — the tool runs an LLM that knows the user's voice and applies the instruction precisely, preserving untouched parts of the post verbatim. Use this for arbitrary tweaks that don't fit a regenerate_post preset (e.g. 'replace Whitfield with Hartford', 'add the price', 'cut the second paragraph', 'rewrite in first person'). Do NOT pass the rewritten post — pass the instruction.",
      inputSchema: z.object({
        id: z.string().min(1).describe("The draft id"),
        instruction: z
          .string()
          .min(1)
          .max(2000)
          .describe(
            "The user's edit request, in their own words. Be specific — the LLM applies it literally. Examples: 'replace Whitfield with Hartford', 'add a CTA at the end', 'rewrite in first person'."
          ),
      }),
      execute: async ({ id, instruction }, { toolCallId }) => {
        console.log(
          `[chat-tool:update_post] userId=${userId} id=${id} instructionLen=${instruction.length}`
        );

        const suggestion = await prisma.postSuggestion.findFirst({
          where: { id, socialAccount: { lateProfile: { userId } } },
          include: {
            socialAccount: {
              select: {
                platform: true,
                insights: true,
                lateProfile: {
                  select: { user: { select: { knowledgeBase: true } } },
                },
              },
            },
          },
        });

        if (!suggestion) {
          console.warn(`[chat-tool:update_post] ⚠️  not_found id=${id}`);
          return {
            ok: false as const,
            error: "not_found",
            message:
              "I couldn't find that draft. It may have been deleted or scheduled.",
          };
        }

        // Same SKU as preset rewrites — both are single-LLM-call edits to one draft.
        const balance = await getBalance({ userId });
        const cost = pointsFor("rewrite", 1);
        log.info(
          `preflight update_post userId=${userId} balance=${balance}pts cost=${cost}pts`
        );
        if (balance < cost) {
          const payload = await buildPaywallPayload(userId, "rewrite");
          return {
            ok: false as const,
            error: "usage_limit_reached",
            surface: "paywall_modal",
            payload,
            message: payload.isPaid
              ? `The user has run out of monthly allowance. Offer the Boost pack or wait until ${payload.resetAt}.`
              : "The user has used their free allowance. Tell them to upgrade to Pro.",
          };
        }

        try {
          await consume({
            userId,
            type: "rewrite",
            count: 1,
            dedupKey: `consume:${toolCallId}`,
            metadata: { suggestionId: id, mode: "freeform" },
          });
        } catch (err) {
          if (err instanceof UsageLimitError) {
            return {
              ok: false as const,
              error: "usage_limit_reached",
              surface: "paywall_modal",
              payload: toWire(err.payload),
              message: "Out of allowance.",
            };
          }
          throw err;
        }

        const kb = suggestion.socialAccount.lateProfile.user
          .knowledgeBase as Record<string, unknown> | null;
        const insights = parseInsights(suggestion.socialAccount.insights);

        try {
          const { object } = await generateObject({
            model: anthropic("claude-sonnet-4-6"),
            schema: rewriteOutputSchema,
            prompt: buildEditPrompt(
              suggestion.content,
              suggestion.socialAccount.platform,
              instruction,
              kb,
              insights
            ),
            ...HUMAN_SAMPLING,
          });

          const cleanedContent = humanizeContent(object.content);

          try {
            await prisma.postSuggestion.update({
              where: { id },
              data: { content: cleanedContent },
            });
          } catch (err) {
            // Race: the user may have published or deleted the draft between
            // the ownership check and this update. Refund and surface a
            // clearer message than the generic edit_failed catch below.
            if (
              typeof err === "object" &&
              err !== null &&
              "code" in err &&
              (err as { code?: string }).code === "P2025"
            ) {
              console.warn(`[chat-tool:update_post] ⚠️  vanished id=${id}`);
              await refund({
                userId,
                type: "rewrite",
                count: 1,
                dedupKey: `refund:${toolCallId}`,
                originalConsumeDedupKey: `consume:${toolCallId}`,
                metadata: { suggestionId: id, reason: "vanished" },
              }).catch((refundErr) => {
                console.error(
                  `[chat-tool:update_post] ✗ refund failed: ${refundErr instanceof Error ? refundErr.message : refundErr}`
                );
              });
              return {
                ok: false as const,
                error: "not_found",
                message:
                  "That draft is gone — you may have already published it.",
              };
            }
            throw err;
          }

          console.log(`[chat-tool:update_post] ✓ edited id=${id}`);
          return {
            ok: true as const,
            id,
            contentPreview: preview(cleanedContent),
          };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(`[chat-tool:update_post] ✗ ${message}`);
          await refund({
            userId,
            type: "rewrite",
            count: 1,
            dedupKey: `refund:${toolCallId}`,
            originalConsumeDedupKey: `consume:${toolCallId}`,
            metadata: { suggestionId: id, error: message },
          }).catch((refundErr) => {
            console.error(
              `[chat-tool:update_post] ✗ refund failed: ${refundErr instanceof Error ? refundErr.message : refundErr}`
            );
          });
          return {
            ok: false as const,
            error: "edit_failed",
            message: "Couldn't apply that edit. Try again in a moment.",
          };
        }
      },
    }),

    regenerate_post: tool({
      description:
        "Rewrite one draft using a preset instruction. Use this for common tweaks instead of update_post when one of these instructions matches the user's intent.",
      inputSchema: z.object({
        id: z.string().min(1).describe("The draft id"),
        instruction: z
          .enum([
            "rewrite",
            "shorter",
            "longer",
            "casual",
            "professional",
            "hashtags",
            "fix",
          ])
          .describe(
            "rewrite=fresh angle same message; shorter=trim; longer=expand; casual=friendlier; professional=more formal; hashtags=add 3–5 hashtags; fix=grammar/spelling"
          ),
      }),
      execute: async ({ id, instruction }, { toolCallId }) => {
        console.log(
          `[chat-tool:regenerate_post] userId=${userId} id=${id} instruction=${instruction} toolCallId=${toolCallId}`
        );

        const suggestion = await prisma.postSuggestion.findFirst({
          where: { id, socialAccount: { lateProfile: { userId } } },
          include: {
            socialAccount: {
              select: {
                platform: true,
                insights: true,
                lateProfile: {
                  select: { user: { select: { knowledgeBase: true } } },
                },
              },
            },
          },
        });

        if (!suggestion) {
          console.warn(`[chat-tool:regenerate_post] ⚠️  not_found id=${id}`);
          return {
            ok: false as const,
            error: "not_found",
            message:
              "I couldn't find that draft. It may have been deleted or scheduled.",
          };
        }

        // Pre-flight: rewrite costs 1 point.
        const balance = await getBalance({ userId });
        const cost = pointsFor("rewrite", 1);
        log.info(
          `preflight regenerate_post userId=${userId} balance=${balance}pts cost=${cost}pts`
        );
        if (balance < cost) {
          const payload = await buildPaywallPayload(userId, "rewrite");
          return {
            ok: false as const,
            error: "usage_limit_reached",
            surface: "paywall_modal",
            payload,
            message: payload.isPaid
              ? `The user has run out of monthly allowance. Offer the Boost pack or wait until ${payload.resetAt}.`
              : "The user has used their free allowance. Tell them to upgrade to Pro.",
          };
        }

        try {
          await consume({
            userId,
            type: "rewrite",
            count: 1,
            dedupKey: `consume:${toolCallId}`,
            metadata: { suggestionId: id, instruction },
          });
        } catch (err) {
          if (err instanceof UsageLimitError) {
            return {
              ok: false as const,
              error: "usage_limit_reached",
              surface: "paywall_modal",
              payload: toWire(err.payload),
              message: "Out of allowance.",
            };
          }
          throw err;
        }

        const kb = suggestion.socialAccount.lateProfile.user
          .knowledgeBase as Record<string, unknown> | null;
        const insights = parseInsights(suggestion.socialAccount.insights);

        try {
          const { object } = await generateObject({
            model: anthropic("claude-sonnet-4-6"),
            schema: rewriteOutputSchema,
            prompt: buildRewritePrompt(
              suggestion.content,
              suggestion.socialAccount.platform,
              instruction,
              kb,
              insights
            ),
            ...HUMAN_SAMPLING,
          });

          const cleanedContent = humanizeContent(object.content);

          await prisma.postSuggestion.update({
            where: { id },
            data: { content: cleanedContent },
          });

          console.log(
            `[chat-tool:regenerate_post] ✓ rewrote id=${id} (${instruction})`
          );

          return {
            ok: true as const,
            id,
            instruction,
            contentPreview: preview(cleanedContent),
          };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(`[chat-tool:regenerate_post] ✗ ${message}`);
          await refund({
            userId,
            type: "rewrite",
            count: 1,
            dedupKey: `refund:${toolCallId}`,
            originalConsumeDedupKey: `consume:${toolCallId}`,
            metadata: { suggestionId: id, error: message },
          }).catch((refundErr) => {
            console.error(
              `[chat-tool:regenerate_post] ✗ refund failed: ${refundErr instanceof Error ? refundErr.message : refundErr}`
            );
          });
          return {
            ok: false as const,
            error: "rewrite_failed",
            message: "Couldn't rewrite that one. Try again in a moment.",
          };
        }
      },
    }),

    delete_draft: tool({
      description: "Remove one specific draft by id.",
      inputSchema: z.object({
        id: z.string().min(1).describe("The draft id"),
      }),
      execute: async ({ id }) => {
        console.log(`[chat-tool:delete_draft] userId=${userId} id=${id}`);

        const existing = await prisma.postSuggestion.findFirst({
          where: { id, socialAccount: { lateProfile: { userId } } },
          select: { id: true },
        });

        if (!existing) {
          console.warn(`[chat-tool:delete_draft] ⚠️  not_found id=${id}`);
          return {
            ok: false as const,
            error: "not_found",
            message: "Couldn't find that draft to delete.",
          };
        }

        await prisma.postSuggestion.delete({ where: { id } });
        console.log(`[chat-tool:delete_draft] ✓ deleted id=${id}`);
        return { ok: true as const, id };
      },
    }),

    set_schedule: tool({
      description:
        "Stage a schedule time on a draft (this does NOT publish — the user still has to click Schedule on the card to commit). Pass an ISO datetime to set it (use one from the 'Best posting times' list in your context), or pass null to clear an existing schedule.",
      inputSchema: z.object({
        id: z.string().min(1).describe("The draft id"),
        scheduledAt: z
          .union([z.string().datetime({ offset: true }), z.null()])
          .describe(
            "ISO 8601 datetime (e.g. 2026-04-29T17:00:00.000Z) to stage, or null to clear."
          ),
      }),
      execute: async ({ id, scheduledAt }) => {
        console.log(
          `[chat-tool:set_schedule] userId=${userId} id=${id} scheduledAt=${scheduledAt}`
        );

        const existing = await prisma.postSuggestion.findFirst({
          where: { id, socialAccount: { lateProfile: { userId } } },
          select: { id: true },
        });

        if (!existing) {
          console.warn(`[chat-tool:set_schedule] ⚠️  not_found id=${id}`);
          return {
            ok: false as const,
            error: "not_found",
            message: "I couldn't find that draft.",
          };
        }

        let nextScheduledAt: Date | null = null;
        if (typeof scheduledAt === "string") {
          const v = validateScheduleIso(scheduledAt);
          if (!v.ok) {
            return {
              ok: false as const,
              error: v.error,
              message: v.message,
            };
          }
          nextScheduledAt = v.date;
        }

        // Race: the user may have published or deleted the draft between the
        // ownership check above and this update. Treat P2025 as "gone" rather
        // than crashing the chat stream.
        try {
          await prisma.postSuggestion.update({
            where: { id },
            data: { scheduledAt: nextScheduledAt },
          });
        } catch (err) {
          if (
            typeof err === "object" &&
            err !== null &&
            "code" in err &&
            (err as { code?: string }).code === "P2025"
          ) {
            console.warn(`[chat-tool:set_schedule] ⚠️  vanished id=${id}`);
            return {
              ok: false as const,
              error: "not_found",
              message:
                "That draft is gone — you may have already published it.",
            };
          }
          throw err;
        }

        console.log(
          `[chat-tool:set_schedule] ✓ ${nextScheduledAt ? "staged" : "cleared"} id=${id}`
        );

        return {
          ok: true as const,
          id,
          scheduledAt: nextScheduledAt ? nextScheduledAt.toISOString() : null,
        };
      },
    }),

    publish_drafts: tool({
      description:
        "Publish one or more drafts NOW to their social accounts. ⚠️ Destructive and final — these go live immediately. NEVER call this without first (1) listing exactly what will be published (count, platforms, one-line content per draft), and (2) getting an explicit confirmation in the user's most recent message ('yes', 'go', 'ok', 'oui', 'vas-y'). Ambiguous replies = do NOT call. Bulk-safe: pass all the ids the user wants to publish in one call. Validation runs automatically per draft; partial failures are reported per-id.",
      inputSchema: z.object({
        ids: z
          .array(z.string().min(1))
          .min(1)
          .max(20)
          .describe(
            "Draft ids to publish. Pass all the user just confirmed in one call — do NOT loop the tool."
          ),
      }),
      execute: async ({ ids }) => {
        console.log(
          `[chat-tool:publish_drafts] userId=${userId} ids=${ids.length}`
        );

        const uniqueIds = Array.from(new Set(ids));
        const items = await Promise.all(
          uniqueIds.map((id) => safePublishOne(userId, id))
        );

        return summarizeBulkPublish(items, "publish");
      },
    }),

    schedule_drafts: tool({
      description:
        "Schedule one or more drafts at the times you pick. ⚠️ This commits the schedule to the platforms — once done, the post WILL fire at that time. NEVER call this without first (1) listing exactly what will be scheduled (count, platforms, content one-liner, AND the human-readable time), and (2) getting an explicit confirmation in the user's most recent message ('yes', 'go', 'ok', 'oui', 'vas-y'). Ambiguous replies = do NOT call. Bulk-safe: pass all items in one call. Use this when the user says 'schedule them now' or 'plan them across the week' — pick the times yourself from 'Best posting times' or sensible midday slots if needed. Use set_schedule (not this) when the user only wants to STAGE a time without committing.",
      inputSchema: z.object({
        items: z
          .array(
            z.object({
              id: z.string().min(1),
              scheduledAt: z
                .string()
                .datetime({ offset: true })
                .describe(
                  "ISO 8601 datetime (e.g. 2026-04-29T17:00:00.000Z). Must be in the future."
                ),
            })
          )
          .min(1)
          .max(20)
          .describe(
            "Draft ids with their scheduled times. Pass all items in one call — do NOT loop the tool."
          ),
      }),
      execute: async ({ items }) => {
        console.log(
          `[chat-tool:schedule_drafts] userId=${userId} items=${items.length}`
        );

        // Dedupe by id (last write wins on time, mirroring publish_drafts).
        const byId = new Map<string, string>();
        for (const item of items) byId.set(item.id, item.scheduledAt);
        const uniqueItems = Array.from(byId, ([id, scheduledAt]) => ({
          id,
          scheduledAt,
        }));

        const results = await Promise.all(
          uniqueItems.map((it) => safeScheduleOne(userId, it.id, it.scheduledAt))
        );

        return summarizeBulkPublish(results, "schedule");
      },
    }),
  };
}

async function safePublishOne(
  userId: string,
  id: string
): Promise<BulkItemResult> {
  try {
    const result = await publishOrScheduleSuggestion({
      userId,
      suggestionId: id,
      action: "publish",
    });
    return { id, result };
  } catch (err) {
    return {
      id,
      result: {
        ok: false,
        error: "publish_failed",
        message: err instanceof Error ? err.message : String(err),
      },
    };
  }
}

async function safeScheduleOne(
  userId: string,
  id: string,
  scheduledAt: string
): Promise<BulkItemResult> {
  const v = validateScheduleIso(scheduledAt);
  if (!v.ok) {
    return {
      id,
      result: {
        ok: false,
        error: v.error === "in_past" ? "schedule_in_past" : "publish_failed",
        ...(v.error === "in_past" ? {} : { message: v.message }),
      } as PublishResult,
    };
  }

  // Scope the staging update by userId ownership — never let the LLM mutate
  // a draft that doesn't belong to this user (count === 0 means the row
  // doesn't exist OR doesn't belong to this user; both look like not_found
  // to the caller).
  const claim = await prisma.postSuggestion.updateMany({
    where: { id, socialAccount: { lateProfile: { userId } } },
    data: { scheduledAt: v.date },
  });
  if (claim.count === 0) {
    return { id, result: { ok: false, error: "not_found" } };
  }

  try {
    const result = await publishOrScheduleSuggestion({
      userId,
      suggestionId: id,
      action: "schedule",
    });
    return { id, result };
  } catch (err) {
    return {
      id,
      result: {
        ok: false,
        error: "publish_failed",
        message: err instanceof Error ? err.message : String(err),
      },
    };
  }
}

interface BulkItemResult {
  id: string;
  result: PublishResult;
}

interface BulkSummary {
  ok: boolean;
  succeeded: {
    id: string;
    postId: string;
    action: "published" | "scheduled";
    partial: boolean;
  }[];
  failed: {
    id: string;
    reason: string;
    message: string;
    recoverable: boolean;
    validationErrors?: { platform: string; error: string }[];
  }[];
  paywall?: { reason: "free_post_limit_reached"; suggestion: string };
}

function summarizeBulkPublish(
  items: BulkItemResult[],
  mode: "publish" | "schedule"
): BulkSummary {
  const succeeded: BulkSummary["succeeded"] = [];
  const failed: BulkSummary["failed"] = [];
  let paywallHit = false;

  for (const { id, result } of items) {
    if (result.ok) {
      succeeded.push({
        id,
        postId: result.postId,
        action: result.action,
        partial: result.partial ?? false,
      });
      continue;
    }

    const entry = describeFailure(id, result, mode);
    if (result.error === "free_post_limit_reached") paywallHit = true;
    failed.push(entry);
  }

  const paywall: BulkSummary["paywall"] = paywallHit
    ? {
        reason: "free_post_limit_reached",
        suggestion:
          "Tell the user they've hit the free post cap and need to upgrade to Pro to publish more.",
      }
    : undefined;

  return {
    ok: failed.length === 0,
    succeeded,
    failed,
    ...(paywall ? { paywall } : {}),
  };
}

function describeFailure(
  id: string,
  result: Extract<PublishResult, { ok: false }>,
  mode: "publish" | "schedule"
): BulkSummary["failed"][number] {
  switch (result.error) {
    case "not_found":
      return {
        id,
        reason: "not_found",
        message: "Draft is gone — already published or deleted.",
        recoverable: false,
      };
    case "already_publishing":
      return {
        id,
        reason: "already_publishing",
        message: "Already in flight — wait a few seconds before retrying.",
        recoverable: true,
      };
    case "free_post_limit_reached":
      return {
        id,
        reason: "free_post_limit_reached",
        message:
          "This account has hit the free post cap. Upgrade to Pro to keep going.",
        recoverable: false,
      };
    case "no_schedule_staged":
      return {
        id,
        reason: "no_schedule_staged",
        message:
          mode === "schedule"
            ? "No schedule time staged on this draft."
            : "Pick a schedule time first.",
        recoverable: true,
      };
    case "schedule_in_past":
      return {
        id,
        reason: "schedule_in_past",
        message: "That schedule time has already passed.",
        recoverable: true,
      };
    case "media_validation_failed":
      return {
        id,
        reason: "media_validation_failed",
        message: result.message,
        recoverable: true,
      };
    case "validation_failed":
      return {
        id,
        reason: "validation_failed",
        message:
          result.validationErrors
            .map((e) => `${e.platform}: ${e.error}`)
            .join("; ") || "Platform validation failed.",
        validationErrors: result.validationErrors,
        recoverable: true,
      };
    case "publish_failed":
      return {
        id,
        reason: "publish_failed",
        message: result.message,
        recoverable: true,
      };
    default: {
      // Exhaustiveness guard: any future PublishResult variant must be handled
      // above or this assignment fails to compile.
      const _exhaustive: never = result;
      void _exhaustive;
      return {
        id,
        reason: "unknown",
        message: "Unknown failure.",
        recoverable: true,
      };
    }
  }
}
