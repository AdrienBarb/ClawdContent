import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe/client";
import { errorMessages } from "@/lib/constants/errorMessage";
import { prisma } from "@/lib/db/prisma";
import {
  ensureUserProfile,
  cleanupUserProfile,
} from "@/lib/services/profile";
import {
  getPlanFromStripePriceId,
  type PlanId,
} from "@/lib/constants/plans";
import {
  grantPlanCredits,
  handleCancellation,
  addTopUpCredits,
} from "@/lib/services/credits";
import {
  trackSubscriptionStarted,
  updateBrevoContact,
} from "@/lib/services/email";

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

  // Deduplicate: skip events we've already processed
  try {
    await prisma.stripeEvent.create({ data: { id: event.id } });
  } catch {
    // Unique constraint violation → already processed
    console.log(`Stripe event ${event.id} already processed, skipping`);
    return NextResponse.json({ received: true }, { status: 200 });
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

function resolvePlanId(subscription: Stripe.Subscription): string {
  // Try metadata first (set during checkout or plan change)
  if (subscription.metadata?.planId) {
    return subscription.metadata.planId;
  }

  // Fall back to reverse-mapping from Stripe price ID
  const priceId = subscription.items?.data?.[0]?.price?.id;
  if (priceId) {
    const mapped = getPlanFromStripePriceId(priceId);
    if (mapped) return mapped.planId;
  }

  // Default for legacy subscriptions
  return "pro";
}

// ─── Event Handlers ───────────────────────────────────────────────

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  if (
    session.payment_status !== "paid" &&
    session.payment_status !== "no_payment_required"
  ) {
    console.log("Payment not completed, skipping");
    return;
  }

  const userId = session.metadata?.userId;
  if (!userId) {
    console.error("Missing userId in checkout metadata");
    return;
  }

  // Handle credit top-up (payment mode, no subscription)
  if (session.metadata?.type === "credit_topup") {
    const quantity = parseInt(session.metadata?.quantity || "0", 10);
    if (quantity > 0) {
      await addTopUpCredits(userId, quantity, session.id);
      console.log(`Added ${quantity} top-up credits for user ${userId}`);
    }
    return;
  }

  const planId = session.metadata?.planId || "pro";

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
      planId,
      currentPeriodStart: period.start,
      currentPeriodEnd: period.end,
    },
    update: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      status: sub.status,
      planId,
      currentPeriodStart: period.start,
      currentPeriodEnd: period.end,
    },
  });

  // Grant initial plan credits
  await grantPlanCredits(userId, planId as PlanId);

  // Provision user's bot container in background
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });

  // Brevo: fire subscription_started (exits onboarding automation)
  if (user?.email) {
    after(async () => {
      await trackSubscriptionStarted(user.email, planId);
    });
  }

  after(async () => {
    try {
      await ensureUserProfile(userId, user?.name ?? "User");
      console.log(`Ensured profile for user ${userId} after checkout`);
    } catch (err) {
      console.error(`Failed to ensure profile for user ${userId}:`, err);
    }
  });
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
  const planId = resolvePlanId(subscription);

  // Idempotent upsert — checkout.session.completed may have already handled this
  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
      planId,
      currentPeriodStart: period.start,
      currentPeriodEnd: period.end,
    },
    update: {
      status: subscription.status,
      planId,
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
  const planId = resolvePlanId(subscription);

  await prisma.subscription.update({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status: subscription.status,
      planId,
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

  // Zero out plan credits (top-up credits persist)
  await handleCancellation(existing.userId);

  // Brevo: mark contact as canceled
  const canceledUser = await prisma.user.findUnique({
    where: { id: existing.userId },
    select: { email: true },
  });
  if (canceledUser?.email) {
    after(async () => {
      await updateBrevoContact(canceledUser.email, {
        SUBSCRIPTION_STATUS: "canceled",
        PLAN_NAME: "",
      });
    });
  }

  // Clean up user profile in background
  after(async () => {
    try {
      await cleanupUserProfile(existing.userId);
      console.log(`Cleaned up profile for user ${existing.userId}`);
    } catch (err) {
      console.error(
        `Failed to clean up profile for user ${existing.userId}:`,
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

  // Monthly credit reset
  const planId = (existing.planId || "pro") as PlanId;
  await grantPlanCredits(existing.userId, planId);
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
