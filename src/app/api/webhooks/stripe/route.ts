import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe/client";
import { errorMessages } from "@/lib/constants/errorMessage";
import { prisma } from "@/lib/db/prisma";
import { provisionUser, deprovisionUser } from "@/lib/services/provisioning";

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json(
      { error: "Missing Stripe signature" },
      { status: 400 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  const buf = Buffer.from(await req.arrayBuffer());

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Webhook signature verification failed:", message);
    return NextResponse.json(
      { error: errorMessages.INVALID_WEBHOOK_PAYLOAD },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;

      case "customer.subscription.created":
        await handleSubscriptionCreated(
          event.data.object as Stripe.Subscription
        );
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription
        );
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        );
        break;

      case "invoice.payment_succeeded":
        await handleInvoiceSucceeded(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handleInvoiceFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json(
      { error: errorMessages.WEBHOOK_PROCESSING_FAILED },
      { status: 500 }
    );
  }
}

// ─── Helpers ──────────────────────────────────────────────────────

function getSubscriptionPeriod(sub: Stripe.Subscription) {
  const item = sub.items?.data?.[0];
  if (!item) return { start: null, end: null };
  return {
    start: new Date(item.current_period_start * 1000),
    end: new Date(item.current_period_end * 1000),
  };
}

function getSubscriptionIdFromInvoice(
  invoice: Stripe.Invoice
): string | null {
  const subRef = invoice.parent?.subscription_details?.subscription;
  if (!subRef) return null;
  return typeof subRef === "string" ? subRef : subRef.id;
}

// ─── Event Handlers ───────────────────────────────────────────────

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  if (session.payment_status !== "paid") {
    console.log("Payment not completed, skipping");
    return;
  }

  const userId = session.metadata?.userId;
  if (!userId) {
    console.error("Missing userId in checkout metadata");
    return;
  }

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  if (!subscriptionId) {
    console.error("Missing subscription in checkout session");
    return;
  }

  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;

  if (!customerId) {
    console.error("Missing customer in checkout session");
    return;
  }

  // Retrieve full subscription for period dates
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const period = getSubscriptionPeriod(sub);

  // Upsert subscription (idempotent with subscription.created)
  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      status: sub.status,
      currentPeriodStart: period.start,
      currentPeriodEnd: period.end,
    },
    update: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      status: sub.status,
      currentPeriodStart: period.start,
      currentPeriodEnd: period.end,
    },
  });

  // Provision user's bot in background (non-blocking)
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user) {
    after(async () => {
      try {
        await provisionUser(userId, user.name);
        console.log(`Provisioned user ${userId} successfully`);
      } catch (err) {
        console.error(`Failed to provision user ${userId}:`, err);
      }
    });
  }
}

async function handleSubscriptionCreated(
  subscription: Stripe.Subscription
): Promise<void> {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.log("No userId in subscription metadata, skipping");
    return;
  }

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const period = getSubscriptionPeriod(subscription);

  // Idempotent upsert — checkout.session.completed may have already handled this
  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
      currentPeriodStart: period.start,
      currentPeriodEnd: period.end,
    },
    update: {
      status: subscription.status,
      currentPeriodStart: period.start,
      currentPeriodEnd: period.end,
    },
  });
}

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
): Promise<void> {
  const existing = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!existing) {
    console.log(`Subscription ${subscription.id} not found in DB, skipping`);
    return;
  }

  const period = getSubscriptionPeriod(subscription);

  await prisma.subscription.update({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status: subscription.status,
      currentPeriodStart: period.start,
      currentPeriodEnd: period.end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<void> {
  const existing = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!existing) {
    console.log(`Subscription ${subscription.id} not found in DB, skipping`);
    return;
  }

  await prisma.subscription.update({
    where: { stripeSubscriptionId: subscription.id },
    data: { status: "canceled" },
  });

  // Deprovision in background
  after(async () => {
    try {
      await deprovisionUser(existing.userId);
      console.log(`Deprovisioned user ${existing.userId}`);
    } catch (err) {
      console.error(
        `Failed to deprovision user ${existing.userId}:`,
        err
      );
    }
  });
}

async function handleInvoiceSucceeded(
  invoice: Stripe.Invoice
): Promise<void> {
  const subscriptionId = getSubscriptionIdFromInvoice(invoice);
  if (!subscriptionId) return;

  const existing = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (!existing) return;

  // Sync latest period dates from Stripe
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const period = getSubscriptionPeriod(sub);

  await prisma.subscription.update({
    where: { stripeSubscriptionId: subscriptionId },
    data: {
      status: sub.status,
      currentPeriodStart: period.start,
      currentPeriodEnd: period.end,
    },
  });

  // Verify container is still running
  const railwayService = await prisma.railwayService.findUnique({
    where: { userId: existing.userId },
  });

  if (!railwayService || railwayService.status === "failed") {
    console.log(
      `Container missing/failed for user ${existing.userId} — will need manual re-provision`
    );
  }
}

async function handleInvoiceFailed(invoice: Stripe.Invoice): Promise<void> {
  const subscriptionId = getSubscriptionIdFromInvoice(invoice);
  if (!subscriptionId) return;

  // Mark as past_due — do NOT deprovision. Stripe will retry.
  await prisma.subscription
    .update({
      where: { stripeSubscriptionId: subscriptionId },
      data: { status: "past_due" },
    })
    .catch(() => {
      // Subscription may not exist yet
    });
}
