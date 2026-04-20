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

interface SocialAccount {
  platform: string;
  username: string;
  lateAccountId: string;
}

export function createZernioTools(
  apiKey: string,
  profileId: string,
  accounts: SocialAccount[],
  timezone: string
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
    return new Date(iso).toLocaleString("en-US", {
      timeZone: timezone,
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  return {
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
        const result = await listPosts(profileId, apiKey, { status, limit, page });
        return {
          posts: result.posts.map((p) => ({
            id: p.id,
            content:
              p.content.length > 200
                ? p.content.slice(0, 200) + "..."
                : p.content,
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
        await deletePost(postId, apiKey);
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
        await unpublishPost(postId, platform, apiKey);
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
        await updatePost(postId, { content, scheduledAt }, apiKey);
        return { success: true, updatedPostId: postId };
      },
    }),

    retryPost: tool({
      description: "Retry publishing a failed post immediately.",
      inputSchema: z.object({
        postId: z.string().describe("The post ID to retry"),
      }),
      execute: async ({ postId }) => {
        await retryPost(postId, apiKey);
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
        const data = await getAnalytics(apiKey, {
          platform,
          fromDate,
          toDate,
          limit,
        });
        return {
          overview: data.overview,
          posts: data.posts.slice(0, 10).map((p) => ({
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
        return getDailyMetrics(apiKey, { fromDate, toDate, platform });
      },
    }),

    getBestTimeToPost: tool({
      description:
        "Get the best times to post based on historical engagement data. Hours are in UTC.",
      inputSchema: z.object({
        platform: z.string().optional().describe("Filter by platform"),
      }),
      execute: async ({ platform }) => {
        const data = await getBestTimeToPost(apiKey, { platform });
        // Zernio: day_of_week 0=Monday, 6=Sunday
        const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        return data.slots.map((s) => ({
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
        const accts = await listAccounts(profileId, apiKey);
        return accts.map((a) => ({
          id: a.id,
          platform: a.platform,
          username: a.username,
          isActive: a.isActive,
        }));
      },
    }),

    getPostLogs: tool({
      description:
        "Check recent publishing logs to debug failures or verify that posts were created successfully. Use this after batch operations to confirm nothing was silently dropped.",
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
        const result = await getLogs(apiKey, {
          type: "publishing",
          status: status ?? "all",
          platform,
          days: days ?? 7,
          limit: limit ?? 20,
        });
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
