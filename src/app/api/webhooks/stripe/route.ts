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
import { getPlanFromStripePriceId } from "@/lib/constants/plans";
import {
  trackSubscriptionStarted,
  trackTrialStarted,
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

      case "customer.subscription.trial_will_end":
        await handleTrialWillEnd(event.data.object as Stripe.Subscription);
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
    // Keep the StripeEvent dedup row so individual handlers (Brevo updates,
    // trialNotifiedAt) stay idempotent across retries. Stripe will redeliver
    // any 5xx with exponential backoff; a row that's already there short-
    // circuits to "already processed". To force a re-run after a real bug,
    // delete the row manually.
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

function getTrialEnd(sub: Stripe.Subscription): Date | null {
  return sub.trial_end ? new Date(sub.trial_end * 1000) : null;
}

function getSubscriptionIdFromInvoice(
  invoice: Stripe.Invoice
): string | null {
  const subRef = invoice.parent?.subscription_details?.subscription;
  if (!subRef) return null;
  return typeof subRef === "string" ? subRef : subRef.id;
}

function resolvePlanId(subscription: Stripe.Subscription): string {
  if (subscription.metadata?.planId) {
    return subscription.metadata.planId;
  }
  const priceId = subscription.items?.data?.[0]?.price?.id;
  if (priceId) {
    const mapped = getPlanFromStripePriceId(priceId);
    if (mapped) return mapped.planId;
  }
  return "pro";
}

async function resolveUserIdFromSubscription(
  subscription: Stripe.Subscription
): Promise<string | null> {
  if (subscription.metadata?.userId) {
    return subscription.metadata.userId;
  }
  // Legacy / Stripe-dashboard-created subs may lack metadata. Look up by ID.
  console.warn(
    `Stripe subscription ${subscription.id} missing metadata.userId; falling back to DB lookup`
  );
  const existing = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscription.id },
    select: { userId: true },
  });
  return existing?.userId ?? null;
}

/** updateMany is a no-op on missing rows — keeps webhook idempotent even if
 * the User was deleted out-of-band. */
async function setTrialEndsAt(userId: string, trialEnd: Date | null) {
  await prisma.user.updateMany({
    where: { id: userId },
    data: { trialEndsAt: trialEnd },
  });
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

  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const period = getSubscriptionPeriod(sub);
  const trialEnd = getTrialEnd(sub);

  // Idempotent with subscription.created
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

  await setTrialEndsAt(userId, trialEnd);

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
  // All app-initiated subs carry metadata.userId (set in createCheckoutSession).
  // Stripe-dashboard-created subs without it are reconciled later via
  // handleSubscriptionUpdated, which resolves via DB lookup.
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
  const trialEnd = getTrialEnd(subscription);

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

  await setTrialEndsAt(userId, trialEnd);
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
  const newStatus = subscription.status;
  const statusChanged = existing.status !== newStatus;

  await prisma.subscription.update({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status: newStatus,
      planId,
      currentPeriodStart: period.start,
      currentPeriodEnd: period.end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });

  // Only mirror trial_end while the sub is actually trialing. After a paid
  // conversion (or cancel-at-period-end toggle) Stripe can update with
  // trial_end either set or null; we don't want to wipe a paying user's
  // trialEndsAt on an unrelated update.
  if (newStatus === "trialing") {
    await setTrialEndsAt(existing.userId, getTrialEnd(subscription));
  }

  if (
    statusChanged &&
    (newStatus === "past_due" || newStatus === "canceled")
  ) {
    const user = await prisma.user.findUnique({
      where: { id: existing.userId },
      select: { email: true },
    });
    if (user?.email) {
      after(async () => {
        await updateBrevoContact(user.email, {
          SUBSCRIPTION_STATUS: newStatus,
        });
      });
    }
  }
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

async function handleTrialWillEnd(
  subscription: Stripe.Subscription
): Promise<void> {
  const userId = await resolveUserIdFromSubscription(subscription);
  if (!userId) {
    console.log(
      `trial_will_end: no userId for subscription ${subscription.id}, skipping`
    );
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, trialNotifiedAt: true },
  });
  if (!user?.email) return;

  // Atomic compare-and-set — only one concurrent caller wins. Without this,
  // a fast Stripe redelivery could race past the trialNotifiedAt check and
  // produce a duplicate trial-start email.
  const claimed = await prisma.user.updateMany({
    where: { id: userId, trialNotifiedAt: null },
    data: { trialNotifiedAt: new Date() },
  });
  if (claimed.count === 0) {
    console.log(`Trial notification already sent for user ${userId}`);
    return;
  }

  // trackTrialStarted swallows its own Brevo errors (see email.ts), so awaiting
  // here can't poison the webhook retry loop — we just want to ensure the
  // email is attempted in-band rather than via after(), so the side-effect
  // ordering follows the CAS write.
  await trackTrialStarted(user.email);
}

async function handleInvoiceSucceeded(
  invoice: Stripe.Invoice
): Promise<void> {
  const subscriptionId = getSubscriptionIdFromInvoice(invoice);
  if (!subscriptionId) return;

  const existing = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
    select: { id: true },
  });
  if (!existing) return;

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
