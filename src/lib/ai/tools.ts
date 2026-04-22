import { tool } from "ai";
import { z } from "zod";
import {
  createPost,
  listPosts,
  deletePost,
  updatePost,
  retryPost,
  unpublishPost,
  getAnalytics,
  getDailyMetrics,
  getBestTimeToPost,
  listAccounts,
  getLogs,
} from "@/lib/late/mutations";
import { lateRequest } from "@/lib/late/client";
import { getUserMedia } from "@/lib/services/media";

interface SocialAccount {
  platform: string;
  username: string;
  lateAccountId: string;
}

export function createZernioTools(
  apiKey: string,
  profileId: string,
  accounts: SocialAccount[],
  timezone: string,
  userId: string
) {
  // Build a map of platform → accountId for resolving in createPost
  const accountsByPlatform = new Map<string, string>();
  for (const a of accounts) {
    accountsByPlatform.set(a.platform, a.lateAccountId);
  }
  // Helper: convert MIME type to Zernio media type (image, video, gif, document)
  function toZernioMediaType(mimeOrType: string): string {
    if (["image", "video", "gif", "document"].includes(mimeOrType))
      return mimeOrType;
    if (mimeOrType.startsWith("video/")) return "video";
    if (mimeOrType === "image/gif") return "gif";
    if (mimeOrType.startsWith("image/")) return "image";
    return "document";
  }

  // Helper: format an ISO date string in the user's local timezone for display
  function formatLocal(iso: string | null | undefined): string | null {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    try {
      return d.toLocaleString("en-US", {
        timeZone: timezone,
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return null;
    }
  }

  return {
    validatePost: tool({
      description:
        "Validate post content before publishing. Checks character limits, missing media, format issues, and platform-specific constraints. Call this before createPost to catch problems early.",
      inputSchema: z.object({
        content: z.string().describe("The post text content to validate"),
        platforms: z
          .array(z.string())
          .describe("Target platforms to validate against"),
        mediaItems: z
          .array(
            z.object({
              url: z.string().describe("Media URL"),
              type: z.string().describe("Media type: image or video"),
            })
          )
          .optional()
          .describe("Media attachments to validate"),
      }),
      execute: async ({ content, platforms, mediaItems }) => {
        console.log(
          `[Tool:validatePost] platforms=${platforms.join(",")}, content="${content.slice(0, 50)}..."`
        );
        const result = await lateRequest<{
          valid: boolean;
          errors?: { platform: string; error: string }[];
          warnings?: { platform: string; warning: string }[];
          message?: string;
        }>("/tools/validate/post", {
          method: "POST",
          apiKey,
          body: {
            content,
            platforms: platforms.map((p) => ({
              platform: p,
              ...(mediaItems?.length
                ? {
                    customMedia: mediaItems.map((m) => ({
                      url: m.url,
                      type: toZernioMediaType(m.type),
                    })),
                  }
                : {}),
            })),
            ...(mediaItems?.length
              ? {
                  mediaItems: mediaItems.map((m) => ({
                    url: m.url,
                    type: toZernioMediaType(m.type),
                  })),
                }
              : {}),
          },
        });
        console.log(
          `[Tool:validatePost] → valid=${result.valid}, errors=${result.errors?.length ?? 0}, warnings=${result.warnings?.length ?? 0}`
        );
        return result;
      },
    }),

    createPost: tool({
      description:
        "Create and publish a social media post. Creates one post per platform for independent error handling. Can also schedule for later. Without scheduledAt, the post is published immediately.",
      inputSchema: z.object({
        content: z.string().describe("The post text content"),
        platforms: z
          .array(z.string())
          .describe(
            "Platforms to post to (e.g. twitter, linkedin, instagram, threads, bluesky, facebook, tiktok, pinterest, youtube, reddit, telegram, snapchat, googlebusiness)"
          ),
        scheduledAt: z
          .string()
          .optional()
          .describe(
            "ISO 8601 date WITH timezone offset to schedule the post (e.g. 2026-04-20T18:00:00+02:00). MUST include offset. Publishes immediately if omitted."
          ),
        mediaItems: z
          .array(
            z.object({
              url: z.string().describe("Media URL"),
              type: z
                .string()
                .describe("Media type: image, video, gif, or document"),
            })
          )
          .optional()
          .describe("Media attachments (optional)"),
      }),
      execute: async ({ content, platforms, scheduledAt, mediaItems }) => {
        console.log(
          `[Tool:createPost] platforms=${platforms.join(",")}, media=${mediaItems?.length ?? 0}, scheduled=${!!scheduledAt}, content="${content.slice(0, 50)}..."`
        );
        const start = Date.now();

        // Convert media types to Zernio format
        const zernioMedia = mediaItems?.map((m) => ({
          url: m.url,
          type: toZernioMediaType(m.type),
        }));

        // Create one post per platform for independent error handling
        const results = await Promise.allSettled(
          platforms.map((p) =>
            createPost(
              profileId,
              {
                content,
                platform: {
                  platform: p,
                  accountId: accountsByPlatform.get(p),
                },
                scheduledAt,
                mediaItems: zernioMedia,
                timezone,
              },
              apiKey
            )
          )
        );

        const platformResults = results.map((r, i) => ({
          platform: platforms[i],
          success: r.status === "fulfilled",
          ...(r.status === "fulfilled"
            ? {
                postId: r.value.id,
                status: r.value.status,
                scheduledAt: r.value.scheduledAt,
                scheduledAtLocal: formatLocal(r.value.scheduledAt),
                publishedAt: r.value.publishedAt,
              }
            : {
                error: r.reason?.message ?? "Unknown error",
              }),
        }));

        const succeeded = platformResults.filter((r) => r.success).length;
        const failed = platformResults.filter((r) => !r.success).length;
        const duration = Date.now() - start;

        for (const r of platformResults) {
          if (r.success) {
            console.log(`[Tool:createPost] ✓ ${r.platform} (${duration}ms)`);
          } else {
            console.error(
              `[Tool:createPost] ✗ ${r.platform}: ${"error" in r ? r.error : "unknown"} (${duration}ms)`
            );
          }
        }

        return {
          summary: `${succeeded}/${platforms.length} succeeded${failed > 0 ? `, ${failed} FAILED` : ""}`,
          results: platformResults,
        };
      },
    }),

    listPosts: tool({
      description:
        "List recent posts. Can filter by status (published, scheduled, failed, draft). Results are paginated (20 per page by default).",
      inputSchema: z.object({
        status: z
          .string()
          .optional()
          .describe("Filter by status: published, scheduled, failed, draft"),
        limit: z
          .number()
          .optional()
          .describe("Max number of posts to return per page (default 20)"),
        page: z
          .number()
          .optional()
          .describe("Page number (default 1)"),
      }),
      execute: async ({ status, limit, page }) => {
        console.log(
          `[Tool:listPosts] status=${status ?? "all"}, limit=${limit ?? 20}, page=${page ?? 1}`
        );
        const result = await listPosts(profileId, apiKey, { status, limit, page });
        console.log(`[Tool:listPosts] → ${result.posts.length} posts returned`);
        return {
          posts: result.posts.map((p) => ({
            id: p.id,
            content: p.content,
            platforms: p.platforms.map((pl) => pl.platform),
            status: p.status,
            scheduledAt: p.scheduledAt,
            scheduledAtLocal: formatLocal(p.scheduledAt),
            publishedAt: p.publishedAt,
            createdAt: p.createdAt,
          })),
          pagination: result.pagination,
        };
      },
    }),

    deletePost: tool({
      description:
        "Delete a draft or scheduled post from Zernio. ONLY works on draft and scheduled posts. Published posts CANNOT be deleted — use unpublishPost instead to remove them from a platform.",
      inputSchema: z.object({
        postId: z.string().describe("The post ID to delete"),
      }),
      execute: async ({ postId }) => {
        console.log(`[Tool:deletePost] postId=${postId}`);
        await deletePost(postId, apiKey);
        console.log(`[Tool:deletePost] ✓ deleted`);
        return { success: true, deletedPostId: postId };
      },
    }),

    unpublishPost: tool({
      description:
        "Remove a published post from a specific platform. The post record is kept in Zernio but marked as cancelled. Not supported on Instagram, TikTok, or Snapchat. Use this instead of deletePost for published posts.",
      inputSchema: z.object({
        postId: z.string().describe("The post ID to unpublish"),
        platform: z
          .string()
          .describe(
            "The platform to remove the post from (twitter, linkedin, threads, facebook, youtube, pinterest, reddit, bluesky, telegram)"
          ),
      }),
      execute: async ({ postId, platform }) => {
        console.log(`[Tool:unpublishPost] postId=${postId}, platform=${platform}`);
        await unpublishPost(postId, platform, apiKey);
        console.log(`[Tool:unpublishPost] ✓ unpublished from ${platform}`);
        return { success: true, unpublishedPostId: postId, platform };
      },
    }),

    updatePost: tool({
      description:
        "Update a post's content or scheduled time. ONLY works on draft, scheduled, or failed posts. Published posts cannot be modified.",
      inputSchema: z.object({
        postId: z.string().describe("The post ID to update"),
        content: z.string().optional().describe("New post content"),
        scheduledAt: z
          .string()
          .optional()
          .describe("New scheduled time (ISO 8601)"),
      }),
      execute: async ({ postId, content, scheduledAt }) => {
        console.log(
          `[Tool:updatePost] postId=${postId}, hasContent=${!!content}, hasSchedule=${!!scheduledAt}`
        );
        await updatePost(postId, { content, scheduledAt }, apiKey);
        // Re-fetch to return the actual post state so the AI reports truthfully
        const { getPost } = await import("@/lib/late/mutations");
        const updated = await getPost(postId, apiKey);
        console.log(
          `[Tool:updatePost] ✓ updated → status=${updated.status}, scheduledAt=${updated.scheduledAt}`
        );
        return {
          success: true,
          updatedPostId: postId,
          status: updated.status,
          content: updated.content,
          scheduledAt: updated.scheduledAt,
          scheduledAtLocal: formatLocal(updated.scheduledAt),
        };
      },
    }),

    retryPost: tool({
      description: "Retry publishing a failed post immediately.",
      inputSchema: z.object({
        postId: z.string().describe("The post ID to retry"),
      }),
      execute: async ({ postId }) => {
        console.log(`[Tool:retryPost] postId=${postId}`);
        await retryPost(postId, apiKey);
        console.log(`[Tool:retryPost] ✓ retried`);
        return { success: true, retriedPostId: postId };
      },
    }),

    getAnalytics: tool({
      description:
        "Get post performance analytics (impressions, likes, comments, shares, etc.).",
      inputSchema: z.object({
        platform: z.string().optional().describe("Filter by platform"),
        fromDate: z.string().optional().describe("Start date (ISO 8601)"),
        toDate: z.string().optional().describe("End date (ISO 8601)"),
        limit: z
          .number()
          .optional()
          .describe("Max number of posts (default 20)"),
      }),
      execute: async ({ platform, fromDate, toDate, limit }) => {
        console.log(
          `[Tool:getAnalytics] platform=${platform ?? "all"}, from=${fromDate ?? "∞"}, to=${toDate ?? "now"}`
        );
        const data = await getAnalytics(apiKey, {
          platform,
          fromDate,
          toDate,
          limit,
        });
        console.log(
          `[Tool:getAnalytics] → ${data.posts.length} posts, overview: ${JSON.stringify(data.overview).slice(0, 100)}`
        );
        return {
          overview: data.overview,
          posts: data.posts.slice(0, 5).map((p) => ({
            content:
              p.content.length > 100
                ? p.content.slice(0, 100) + "..."
                : p.content,
            platform: p.platform,
            publishedAt: p.publishedAt,
            analytics: p.analytics,
            platformPostUrl: p.platformPostUrl,
          })),
          pagination: data.pagination,
        };
      },
    }),

    getDailyMetrics: tool({
      description:
        "Get daily aggregated metrics (post count, impressions, engagement) over a date range.",
      inputSchema: z.object({
        fromDate: z.string().optional().describe("Start date (ISO 8601)"),
        toDate: z.string().optional().describe("End date (ISO 8601)"),
        platform: z.string().optional().describe("Filter by platform"),
      }),
      execute: async ({ fromDate, toDate, platform }) => {
        console.log(
          `[Tool:getDailyMetrics] platform=${platform ?? "all"}, from=${fromDate ?? "∞"}, to=${toDate ?? "now"}`
        );
        const result = await getDailyMetrics(apiKey, { fromDate, toDate, platform });
        console.log(`[Tool:getDailyMetrics] → returned metrics`);
        return result;
      },
    }),

    getBestTimeToPost: tool({
      description:
        "Get the best times to post based on historical engagement data. Hours are in UTC.",
      inputSchema: z.object({
        platform: z.string().optional().describe("Filter by platform"),
      }),
      execute: async ({ platform }) => {
        console.log(`[Tool:getBestTimeToPost] platform=${platform ?? "all"}`);
        const data = await getBestTimeToPost(apiKey, { platform });
        console.log(`[Tool:getBestTimeToPost] → ${data.slots.length} slots`);
        // Zernio: day_of_week 0=Monday, 6=Sunday
        const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        return data.slots
          .sort((a, b) => b.avg_engagement - a.avg_engagement)
          .slice(0, 5)
          .map((s) => ({
            dayOfWeek: dayNames[s.day_of_week],
            hourUTC: s.hour,
            avgEngagement: s.avg_engagement,
            postCount: s.post_count,
          }));
      },
    }),

    listAccounts: tool({
      description: "List the user's connected social media accounts.",
      inputSchema: z.object({}),
      execute: async () => {
        console.log(`[Tool:listAccounts]`);
        const accts = await listAccounts(profileId, apiKey);
        console.log(`[Tool:listAccounts] → ${accts.length} accounts`);
        return accts.map((a) => ({
          id: a.id,
          platform: a.platform,
          username: a.username,
          isActive: a.isActive,
        }));
      },
    }),

    listUserMedia: tool({
      description:
        "List the user's uploaded media files (images and videos). Use this to find existing media the user has uploaded that can be attached to posts via createPost.",
      inputSchema: z.object({}),
      execute: async () => {
        console.log(`[Tool:listUserMedia]`);
        const media = await getUserMedia(userId);
        console.log(`[Tool:listUserMedia] → ${media.length} media files`);
        return {
          media: media.map((m) => ({
            id: m.id,
            url: m.url,
            resourceType: m.resourceType,
            format: m.format,
            width: m.width,
            height: m.height,
            createdAt: m.createdAt,
          })),
        };
      },
    }),

    updateStrategy: tool({
      description:
        "Save or update the user's content strategy. Call this whenever you learn something about the user's preferences, target audience, writing style, content themes, or constraints. This is a partial update — only include the fields you want to change. Arrays (contentPillars, constraints) replace the previous value entirely. Voice is merged per-platform (setting linkedin won't erase twitter).",
      inputSchema: z.object({
        goal: z
          .string()
          .max(500)
          .optional()
          .describe("User's primary social media goal"),
        audience: z
          .string()
          .max(500)
          .optional()
          .describe("Target audience description"),
        angle: z
          .string()
          .max(500)
          .optional()
          .describe("User's unique angle or positioning"),
        contentPillars: z
          .array(z.string().max(200))
          .max(5)
          .optional()
          .describe("Main content themes (3-5, replaces existing list)"),
        voice: z
          .object({
            general: z.string().max(300).optional(),
            linkedin: z.string().max(300).optional(),
            twitter: z.string().max(300).optional(),
            instagram: z.string().max(300).optional(),
            threads: z.string().max(300).optional(),
            bluesky: z.string().max(300).optional(),
            facebook: z.string().max(300).optional(),
            tiktok: z.string().max(300).optional(),
            pinterest: z.string().max(300).optional(),
            youtube: z.string().max(300).optional(),
          })
          .optional()
          .describe("Voice/tone preferences — general or per-platform"),
        constraints: z
          .array(z.string().max(200))
          .max(10)
          .optional()
          .describe("Hard rules to always follow or avoid (replaces existing list)"),
      }),
      execute: async (partial) => {
        console.log(
          `[Tool:updateStrategy] userId=${userId}, fields=${Object.keys(partial).join(",")}`
        );
        const { updateUserStrategy } = await import(
          "@/lib/services/strategy"
        );
        await updateUserStrategy(userId, partial);
        console.log(`[Tool:updateStrategy] ✓ strategy updated`);
        return { success: true, updatedFields: Object.keys(partial) };
      },
    }),

    getPostLogs: tool({
      description:
        "Check recent publishing logs to debug failures or verify that posts were created successfully. Use this after batch operations to confirm nothing was silently dropped.",
      providerOptions: {
        anthropic: { cacheControl: { type: "ephemeral" } },
      },
      inputSchema: z.object({
        status: z
          .string()
          .optional()
          .describe("Filter: success, failed, pending, skipped, or all (default all)"),
        platform: z
          .string()
          .optional()
          .describe("Filter by platform"),
        days: z
          .number()
          .optional()
          .describe("Look back N days (default 7, max 90)"),
        limit: z
          .number()
          .optional()
          .describe("Max logs to return (default 20, max 100)"),
      }),
      execute: async ({ status, platform, days, limit }) => {
        console.log(
          `[Tool:getPostLogs] status=${status ?? "all"}, platform=${platform ?? "all"}, days=${days ?? 7}`
        );
        const result = await getLogs(apiKey, {
          type: "publishing",
          status: status ?? "all",
          platform,
          days: days ?? 7,
          limit: limit ?? 20,
        });
        console.log(`[Tool:getPostLogs] → ${result.logs.length} logs`);
        return {
          logs: result.logs.map((l) => ({
            action: l.action,
            platform: l.platform,
            status: l.status,
            errorMessage: l.errorMessage,
            errorCode: l.errorCode,
            createdAt: l.createdAt,
          })),
          pagination: result.pagination,
        };
      },
    }),
  };
}
