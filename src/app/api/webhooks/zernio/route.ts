import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";
import { resendClient } from "@/lib/resend/resendClient";
import { AccountDisconnectedEmail } from "@/lib/emails/AccountDisconnectedEmail";
import config from "@/lib/config";
import { retryPost } from "@/lib/late/mutations";
import { updateBatchPostSnapshot } from "@/lib/services/autopilot/batch";
import { sendPostFailedAlert } from "@/lib/services/autopilot/digest";
import type { BatchPostSnapshot } from "@/lib/schemas/autopilot";

const ZERNIO_WEBHOOK_SECRET = process.env.ZERNIO_WEBHOOK_SECRET;

function verifySignature(payload: string, signature: string): boolean {
  if (!ZERNIO_WEBHOOK_SECRET) return false;
  const expected = crypto
    .createHmac("sha256", ZERNIO_WEBHOOK_SECRET)
    .update(payload)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-zernio-signature");
  const body = await req.text();

  // Verify signature if secret is configured
  if (ZERNIO_WEBHOOK_SECRET) {
    if (!signature || !verifySignature(body, signature)) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }
  }

  const event = JSON.parse(body);

  switch (event.event) {
    case "account.disconnected": {
      const { accountId, platform, username, disconnectionType, reason } =
        event.account;

      // Only handle unintentional disconnects (token expired/revoked)
      if (disconnectionType === "unintentional") {
        await prisma.socialAccount.updateMany({
          where: { lateAccountId: accountId },
          data: { status: "disconnected" },
        });

        // Send email notification in background
        after(async () => {
          try {
            // Find the user who owns this account
            const socialAccount = await prisma.socialAccount.findUnique({
              where: { lateAccountId: accountId },
              include: {
                lateProfile: {
                  include: { user: { select: { email: true, name: true } } },
                },
              },
            });

            if (!socialAccount?.lateProfile?.user?.email) return;

            const { email, name } = socialAccount.lateProfile.user;
            const reconnectUrl = `${config.project.url}/d/accounts`;

            await resendClient.emails.send({
              from: config.contact.email,
              to: email,
              subject: `Your ${platform} account needs to be reconnected`,
              react: AccountDisconnectedEmail({
                platform,
                username,
                reconnectUrl,
              }),
            });

            console.log(
              `[Zernio Webhook] Sent disconnection email to ${name ?? email} for ${platform}/@${username}`
            );
          } catch (error) {
            console.error(
              "[Zernio Webhook] Failed to send disconnection email:",
              error
            );
          }
        });

        console.log(
          `[Zernio Webhook] Account ${accountId} disconnected: ${reason}`
        );
      }
      break;
    }

    case "account.connected": {
      const { accountId } = event.account;
      await prisma.socialAccount.updateMany({
        where: { lateAccountId: accountId },
        data: { status: "active" },
      });
      break;
    }

    case "post.failed":
    case "post.partial": {
      const { id, content, platforms } = event.post;
      const failedPlatforms = platforms
        .filter((p: { status: string }) => p.status === "failed")
        .map((p: { platform: string; error?: string }) => `${p.platform}: ${p.error ?? "unknown error"}`)
        .join(", ");

      console.error(
        `[Zernio Webhook] Post ${event.event} — postId=${id} content="${content?.slice(0, 50)}..." failures=[${failedPlatforms}]`
      );

      // Autopilot safety net: posts that belong to a weekly batch get ONE
      // automatic retry; a second failure marks the snapshot "failed" (the
      // dashboard attention strip reads it) and emails the user. The
      // retriedAt marker is what stops a retry loop — Zernio fires
      // post.failed again if the retry also fails.
      after(async () => {
        try {
          const batch = await prisma.weeklyBatch.findFirst({
            where: { posts: { array_contains: [{ externalPostId: id }] } },
            orderBy: { weekStart: "desc" },
            select: { id: true, userId: true, posts: true },
          });
          if (!batch || !Array.isArray(batch.posts)) return;
          const snapshot = (batch.posts as unknown as BatchPostSnapshot[]).find(
            (p) => p.externalPostId === id
          );
          if (!snapshot) return;

          if (!snapshot.retriedAt) {
            const profile = await prisma.lateProfile.findUnique({
              where: { userId: batch.userId },
              select: { lateApiKey: true },
            });
            if (!profile) return;
            await retryPost(id, profile.lateApiKey);
            await updateBatchPostSnapshot(
              batch.id,
              { externalPostId: id },
              { retriedAt: new Date().toISOString() }
            );
            console.log(`[Zernio Webhook] retried autopilot post ${id}`);
            return;
          }

          await updateBatchPostSnapshot(
            batch.id,
            { externalPostId: id },
            { status: "failed" }
          );
          await sendPostFailedAlert({
            userId: batch.userId,
            platform: snapshot.platform,
            username: snapshot.username,
            contentPreview: snapshot.contentPreview ?? null,
          });
          console.log(
            `[Zernio Webhook] autopilot post ${id} failed twice — user alerted`
          );
        } catch (err) {
          console.error(
            "[Zernio Webhook] post.failed retry handling error:",
            err
          );
        }
      });
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
