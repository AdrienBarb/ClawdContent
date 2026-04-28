import "server-only";
import { tool } from "ai";
import { z } from "zod";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { prisma } from "@/lib/db/prisma";
import { createFromBrief } from "@/lib/services/createFromBrief";
import { claimSuggestionsCooldown } from "@/lib/services/rateLimit";
import { buildRewritePrompt, rewriteOutputSchema } from "@/lib/ai/rewrite";
import { parseInsights } from "@/lib/services/insightsHelpers";

interface CreateChatToolsArgs {
  userId: string;
  accountIds: string[];
}

import { preview } from "./preview";

export function createChatTools({ userId, accountIds }: CreateChatToolsArgs) {
  return {
    generate_posts: tool({
      description:
        "Draft a fresh batch of post ideas for the currently selected accounts. The brief is the user's request in their own words — pass it through verbatim. WARNING: this REPLACES every existing draft on each selected account. Confirm with the user before calling when drafts already exist.",
      inputSchema: z.object({
        brief: z
          .string()
          .min(1)
          .max(4000)
          .describe(
            "The user's request in their own words. Examples: 'Generate me 5 posts about my Easter menu', 'Plan a week of content for our spring launch'. Faithfully relay what they wrote."
          ),
      }),
      execute: async ({ brief }) => {
        console.log(
          `[chat-tool:generate_posts] userId=${userId} accountIds=${accountIds.join(",")} briefLen=${brief.length}`
        );

        if (accountIds.length === 0) {
          return {
            ok: false as const,
            error: "no_accounts_selected",
            message:
              "No accounts are selected. Ask the user to pick at least one account in the chip selector at the top of the page.",
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
          const { suggestions, failedAccountIds } = await createFromBrief({
            userId,
            accountIds,
            brief,
          });

          console.log(
            `[chat-tool:generate_posts] ✓ ${suggestions.length} drafts, ${failedAccountIds.length} failed accounts`
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
        "Overwrite the content of one specific draft. Use the id from the existing-drafts list. Pass the COMPLETE new post text — this is a full replacement, not a patch.",
      inputSchema: z.object({
        id: z.string().min(1).describe("The draft id"),
        content: z
          .string()
          .min(1)
          .max(10000)
          .describe(
            "The complete new post content. No quotes around it, no 'Post:' prefix — write it ready to publish."
          ),
      }),
      execute: async ({ id, content }) => {
        console.log(
          `[chat-tool:update_post] userId=${userId} id=${id} contentLen=${content.length}`
        );

        const existing = await prisma.postSuggestion.findFirst({
          where: { id, socialAccount: { lateProfile: { userId } } },
          select: { id: true },
        });

        if (!existing) {
          console.warn(`[chat-tool:update_post] ⚠️  not_found id=${id}`);
          return {
            ok: false as const,
            error: "not_found",
            message:
              "I couldn't find that draft. It may have been deleted or scheduled.",
          };
        }

        const updated = await prisma.postSuggestion.update({
          where: { id },
          data: { content },
          select: { id: true, content: true },
        });

        console.log(`[chat-tool:update_post] ✓ updated id=${id}`);
        return {
          ok: true as const,
          id: updated.id,
          contentPreview: preview(updated.content),
        };
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
      execute: async ({ id, instruction }) => {
        console.log(
          `[chat-tool:regenerate_post] userId=${userId} id=${id} instruction=${instruction}`
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
          });

          await prisma.postSuggestion.update({
            where: { id },
            data: { content: object.content },
          });

          console.log(
            `[chat-tool:regenerate_post] ✓ rewrote id=${id} (${instruction})`
          );

          return {
            ok: true as const,
            id,
            instruction,
            contentPreview: preview(object.content),
          };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(`[chat-tool:regenerate_post] ✗ ${message}`);
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
          const parsed = new Date(scheduledAt);
          if (Number.isNaN(parsed.getTime())) {
            return {
              ok: false as const,
              error: "invalid_iso",
              message: "That's not a valid ISO datetime.",
            };
          }
          if (parsed.getTime() <= Date.now()) {
            return {
              ok: false as const,
              error: "in_past",
              message:
                "That time has already passed. Pick a future slot.",
            };
          }
          const oneYearMs = 365 * 24 * 60 * 60 * 1000;
          if (parsed.getTime() > Date.now() + oneYearMs) {
            return {
              ok: false as const,
              error: "too_far",
              message: "Pick a time within the next year.",
            };
          }
          nextScheduledAt = parsed;
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
  };
}
