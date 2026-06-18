import "server-only";
import { prisma } from "@/lib/db/prisma";
import { resendClient } from "@/lib/resend/resendClient";
import config from "@/lib/config";
import {
  WeeklyDigestEmail,
  type DigestPostItem,
} from "@/lib/emails/WeeklyDigestEmail";
import { BatchFailedEmail } from "@/lib/emails/BatchFailedEmail";
import { PostFailedEmail } from "@/lib/emails/PostFailedEmail";
import {
  createActionToken,
  type ActionTokenPayload,
} from "./actionTokens";
import { markDigestSent } from "./batch";
import { DEFAULT_TIMEZONE } from "./time";
import type { BatchPostSnapshot } from "@/lib/schemas/autopilot";

function actionUrl(payload: ActionTokenPayload): string {
  const token = createActionToken(payload);
  return `${config.project.url}/api/autopilot/actions?token=${encodeURIComponent(token)}`;
}

function firstNameOf(name: string | null, email: string): string {
  const first = (name ?? "").trim().split(/\s+/)[0];
  return first || email.split("@")[0];
}

function timeLabel(iso: string, timeZone: string): string {
  // Include the date — first-week slots can land up to a week out, and a bare
  // weekday ("Monday 9:00 AM") would be ambiguous.
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

/**
 * Send the weekly digest for a ready batch. Idempotent twice over: Resend
 * idempotency key `digest/{batchId}` + the digestSentAt stamp.
 */
export async function sendWeeklyDigest(batchId: string): Promise<void> {
  const batch = await prisma.weeklyBatch.findUnique({
    where: { id: batchId },
    include: { user: { select: { name: true, email: true, timezone: true } } },
  });
  if (!batch || batch.digestSentAt) return;

  const posts = (Array.isArray(batch.posts) ? batch.posts : []) as unknown as BatchPostSnapshot[];
  if (posts.length === 0) return;

  const timeZone = batch.user.timezone ?? DEFAULT_TIMEZONE;
  const isReview = batch.mode === "review";
  const dashboardUrl = `${config.project.url}/d`;

  const items: DigestPostItem[] = posts.map((post) => {
    const exp = Math.floor(new Date(post.scheduledAt).getTime() / 1000);
    const ref = post.externalPostId ?? post.suggestionId;
    const refKind = post.externalPostId ? ("external" as const) : ("local" as const);
    const actionable = Boolean(ref) && post.status !== "failed";
    return {
      platform: post.platform,
      username: post.username,
      scheduledAtLabel: timeLabel(post.scheduledAt, timeZone),
      contentPreview:
        post.contentPreview.length < post.content.length
          ? `${post.contentPreview}…`
          : post.contentPreview,
      mediaUrl: post.mediaType === "image" ? post.mediaUrl : null,
      mediaType: post.mediaType,
      status: post.status,
      vetoUrl: actionable
        ? actionUrl({
            userId: batch.userId,
            postRef: ref!,
            refKind,
            action: "veto",
            batchId: batch.id,
            exp,
          })
        : null,
      regenerateUrl: actionable
        ? actionUrl({
            userId: batch.userId,
            postRef: ref!,
            refKind,
            action: "regenerate",
            batchId: batch.id,
            exp,
          })
        : null,
      editUrl: dashboardUrl,
    };
  });

  const firstScheduled = posts
    .map((p) => p.scheduledAt)
    .sort()[0];

  const { error } = await resendClient.emails.send(
    {
      from: config.contact.email,
      to: batch.user.email,
      subject: isReview
        ? `Your week is planned — ${posts.length} posts ready to review`
        : `Your week is ready — ${posts.length} posts scheduled`,
      react: WeeklyDigestEmail({
        firstName: firstNameOf(batch.user.name, batch.user.email),
        postCount: posts.length,
        firstPostLabel: firstScheduled ? timeLabel(firstScheduled, timeZone) : null,
        mode: isReview ? "review" : "full_auto",
        posts: items,
        dashboardUrl,
      }),
      tags: [{ name: "category", value: "autopilot_digest" }],
    },
    { idempotencyKey: `digest/${batchId}` }
  );

  if (error) {
    throw new Error(`Digest send failed: ${error.message}`);
  }
  await markDigestSent(batchId);
}

export async function sendBatchFailedAlert(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });
  if (!user) return;
  const { error } = await resendClient.emails.send({
    from: config.contact.email,
    to: user.email,
    subject: "We hit a snag preparing your week",
    react: BatchFailedEmail({
      firstName: firstNameOf(user.name, user.email),
      dashboardUrl: `${config.project.url}/d`,
    }),
    tags: [{ name: "category", value: "autopilot_alert" }],
  });
  if (error) {
    console.error(`[autopilot:digest] batch-failed alert error: ${error.message}`);
  }
}

export async function sendPostFailedAlert({
  userId,
  platform,
  username,
  contentPreview,
}: {
  userId: string;
  platform: string;
  username: string;
  contentPreview: string | null;
}): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });
  if (!user) return;
  const { error } = await resendClient.emails.send({
    from: config.contact.email,
    to: user.email,
    subject: `A post to @${username} needs your attention`,
    react: PostFailedEmail({
      firstName: firstNameOf(user.name, user.email),
      platform,
      username,
      contentPreview,
      dashboardUrl: `${config.project.url}/d`,
    }),
    tags: [{ name: "category", value: "autopilot_alert" }],
  });
  if (error) {
    console.error(`[autopilot:digest] post-failed alert error: ${error.message}`);
  }
}
