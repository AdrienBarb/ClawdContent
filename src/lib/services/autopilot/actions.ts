import "server-only";
import { prisma } from "@/lib/db/prisma";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { deletePost, getPost, updatePost } from "@/lib/late/mutations";
import { buildRewritePrompt, rewriteOutputSchema } from "@/lib/ai/rewrite";
import { humanizeContent } from "@/lib/ai/humanize";
import { HUMAN_SAMPLING } from "@/lib/ai/humanRules";
import { captureServerEvent } from "@/lib/tracking/postHogClient";
import { updateBatchPostSnapshot } from "./batch";
import type { ActionTokenPayload } from "./actionTokens";

export type ExecuteActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

/**
 * A "local" token references a staged PostSuggestion. After "Launch my week"
 * the row is deleted on commit — resolve through the batch snapshot to the
 * live Zernio post so digest links keep working after launch.
 */
async function resolveCommittedRef(
  batchId: string,
  suggestionId: string
): Promise<string | null> {
  const batch = await prisma.weeklyBatch.findUnique({
    where: { id: batchId },
    select: { posts: true },
  });
  if (!batch || !Array.isArray(batch.posts)) return null;
  const snap = (batch.posts as unknown as { suggestionId?: string | null; externalPostId?: string | null }[]).find(
    (p) => p.suggestionId === suggestionId
  );
  return snap?.externalPostId ?? null;
}

/**
 * Executes a verified one-click digest action. The token already proves the
 * user + post + action; this just carries it out against Zernio or the local
 * staged row and keeps the batch snapshot in sync.
 */
export async function executeAutopilotAction(
  payload: ActionTokenPayload
): Promise<ExecuteActionResult> {
  const { userId, postRef, refKind, action, batchId } = payload;

  const profile = await prisma.lateProfile.findUnique({
    where: { userId },
    select: { lateApiKey: true },
  });

  if (action === "veto") {
    if (refKind === "external") {
      if (!profile) return { ok: false, message: "Account not found." };
      try {
        await deletePost(postRef, profile.lateApiKey);
      } catch (err) {
        console.warn(
          `[autopilot:actions] veto deletePost failed ${postRef}: ${err instanceof Error ? err.message : err}`
        );
        return {
          ok: false,
          message: "This post could not be cancelled — it may already be live.",
        };
      }
      await updateBatchPostSnapshot(batchId, { externalPostId: postRef }, { status: "vetoed" });
    } else {
      const deleted = await prisma.postSuggestion.deleteMany({
        where: { id: postRef, socialAccount: { lateProfile: { userId } } },
      });
      if (deleted.count === 0) {
        // Row gone — the week may have been launched since the digest went
        // out. Fall through to the committed Zernio post when it exists.
        const externalId = await resolveCommittedRef(batchId, postRef);
        if (!externalId || !profile) {
          return { ok: false, message: "This post is already gone." };
        }
        try {
          await deletePost(externalId, profile.lateApiKey);
        } catch (err) {
          console.warn(
            `[autopilot:actions] veto (post-launch) failed ${externalId}: ${err instanceof Error ? err.message : err}`
          );
          return {
            ok: false,
            message: "This post could not be cancelled — it may already be live.",
          };
        }
        await updateBatchPostSnapshot(
          batchId,
          { suggestionId: postRef },
          { status: "vetoed" }
        );
      } else {
        await updateBatchPostSnapshot(batchId, { suggestionId: postRef }, { status: "vetoed" });
      }
    }
    await captureServerEvent(userId, "autopilot_post_vetoed", {
      batchId,
      refKind,
    });
    return { ok: true, message: "Done — this post will not be published." };
  }

  if (action === "regenerate") {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { knowledgeBase: true },
    });
    const kb = (user?.knowledgeBase as Record<string, unknown> | null) ?? null;

    if (refKind === "external") {
      if (!profile) return { ok: false, message: "Account not found." };
      try {
        const post = await getPost(postRef, profile.lateApiKey);
        const platform = post.platforms?.[0]?.platform ?? "instagram";
        const { object } = await generateObject({
          model: anthropic("claude-sonnet-4-6"),
          schema: rewriteOutputSchema,
          prompt: buildRewritePrompt(post.content, platform, "rewrite", kb),
          ...HUMAN_SAMPLING,
        });
        const content = humanizeContent(object.content);
        await updatePost(postRef, { content }, profile.lateApiKey);
        await updateBatchPostSnapshot(
          batchId,
          { externalPostId: postRef },
          { contentPreview: content.slice(0, 140), content: content.slice(0, 140) }
        );
      } catch (err) {
        console.warn(
          `[autopilot:actions] regenerate failed ${postRef}: ${err instanceof Error ? err.message : err}`
        );
        return {
          ok: false,
          message: "Couldn't rewrite this post. Open the app to edit it instead.",
        };
      }
    } else {
      const suggestion = await prisma.postSuggestion.findFirst({
        where: { id: postRef, socialAccount: { lateProfile: { userId } } },
        include: { socialAccount: { select: { platform: true } } },
      });
      if (!suggestion) {
        // Launched since the digest — rewrite the committed Zernio post.
        const externalId = await resolveCommittedRef(batchId, postRef);
        if (!externalId || !profile) {
          return { ok: false, message: "This post is already gone." };
        }
        try {
          const post = await getPost(externalId, profile.lateApiKey);
          const platform = post.platforms?.[0]?.platform ?? "instagram";
          const { object } = await generateObject({
            model: anthropic("claude-sonnet-4-6"),
            schema: rewriteOutputSchema,
            prompt: buildRewritePrompt(post.content, platform, "rewrite", kb),
            ...HUMAN_SAMPLING,
          });
          const content = humanizeContent(object.content);
          await updatePost(externalId, { content }, profile.lateApiKey);
          await updateBatchPostSnapshot(
            batchId,
            { suggestionId: postRef },
            { contentPreview: content.slice(0, 140), content: content.slice(0, 140) }
          );
          await captureServerEvent(userId, "autopilot_post_regenerated", {
            batchId,
            refKind: "local_committed",
          });
          return {
            ok: true,
            message: "Rewritten — the new version replaces the old one.",
          };
        } catch (err) {
          console.warn(
            `[autopilot:actions] regenerate (post-launch) failed ${externalId}: ${err instanceof Error ? err.message : err}`
          );
          return {
            ok: false,
            message: "Couldn't rewrite this post. Open the app to edit it instead.",
          };
        }
      }
      const { object } = await generateObject({
        model: anthropic("claude-sonnet-4-6"),
        schema: rewriteOutputSchema,
        prompt: buildRewritePrompt(
          suggestion.content,
          suggestion.socialAccount.platform,
          "rewrite",
          kb
        ),
        ...HUMAN_SAMPLING,
      });
      const content = humanizeContent(object.content);
      await prisma.postSuggestion.update({
        where: { id: postRef },
        data: { content },
      });
      await updateBatchPostSnapshot(
        batchId,
        { suggestionId: postRef },
        { contentPreview: content.slice(0, 140), content: content.slice(0, 140) }
      );
    }
    await captureServerEvent(userId, "autopilot_post_regenerated", {
      batchId,
      refKind,
    });
    return { ok: true, message: "Rewritten — the new version replaces the old one." };
  }

  return { ok: false, message: "Unknown action." };
}
