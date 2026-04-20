import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";

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
      const { accountId, disconnectionType, reason } = event.account;

      // Only handle unintentional disconnects (token expired/revoked)
      if (disconnectionType === "unintentional") {
        await prisma.socialAccount.updateMany({
          where: { lateAccountId: accountId },
          data: { status: "disconnected" },
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

    default:
      // Ignore unhandled events
      break;
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
