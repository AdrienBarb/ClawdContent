import { prisma } from "@/lib/db/prisma";
import { stripe } from "@/lib/stripe/client";
import {
  type PlanId,
  type BillingInterval,
  getStripePriceId,
} from "@/lib/constants/plans";
import { DEFAULT_CADENCE } from "@/lib/constants/cadence";

const TRIAL_PERIOD_DAYS = 3;

export type CheckoutIntent = "billing" | "onboarding";

async function resolveOnboardingSuccessPath(userId: string): Promise<string> {
  const lateProfile = await prisma.lateProfile.findUnique({
    where: { userId },
    include: { socialAccounts: true },
  });

  const accounts = lateProfile?.socialAccounts ?? [];
  const enabled = accounts.find(
    (a) => a.status === "active" && DEFAULT_CADENCE[a.platform] !== null
  );

  return enabled ? `/d/${enabled.platform}` : "/d";
}

export async function createCheckoutSession(
  userId: string,
  email: string,
  planId: PlanId,
  interval: BillingInterval,
  affonsoReferral?: string,
  intent: CheckoutIntent = "billing"
): Promise<string> {
  const existing = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (
    existing &&
    (existing.status === "active" || existing.status === "trialing")
  ) {
    throw new Error("ALREADY_SUBSCRIBED");
  }

  // Reuse Stripe customer if one exists
  let customerId = existing?.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email,
      metadata: { userId },
    });
    customerId = customer.id;
  }

  const priceId = getStripePriceId(planId, interval);

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  let successUrl: string;
  let cancelUrl: string;

  if (intent === "onboarding") {
    const path = await resolveOnboardingSuccessPath(userId);
    successUrl = `${baseUrl}${path}`;
    cancelUrl = `${baseUrl}/onboarding/checkout?cancelled=1`;
  } else {
    successUrl = `${baseUrl}/d?payment=success`;
    cancelUrl = `${baseUrl}/d`;
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    allow_promotion_codes: true,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      planId,
      ...(affonsoReferral && { affonso_referral: affonsoReferral }),
    },
    subscription_data: {
      metadata: { userId, planId },
      trial_period_days: TRIAL_PERIOD_DAYS,
    },
  });

  if (!session.url) {
    throw new Error("Failed to create checkout session");
  }

  return session.url;
}

export async function getSubscriptionByUserId(userId: string) {
  return prisma.subscription.findUnique({ where: { userId } });
}

export async function createPortalSession(userId: string): Promise<string> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription?.stripeCustomerId) {
    throw new Error("NO_SUBSCRIPTION");
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${baseUrl}/d/billing`,
  });

  return portalSession.url;
}

export async function changePlan(
  userId: string,
  newPlanId: PlanId,
  newInterval: BillingInterval
): Promise<void> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription) {
    throw new Error("NO_SUBSCRIPTION");
  }

  if (
    subscription.status !== "active" &&
    subscription.status !== "trialing"
  ) {
    throw new Error("SUBSCRIPTION_NOT_ACTIVE");
  }

  const newPriceId = getStripePriceId(newPlanId, newInterval);

  const stripeSub = await stripe.subscriptions.retrieve(
    subscription.stripeSubscriptionId
  );

  const item = stripeSub.items.data[0];
  if (!item) {
    throw new Error("No subscription item found");
  }

  // Check if this is the same price (no change needed)
  if (item.price.id === newPriceId) {
    throw new Error("SAME_PLAN");
  }

  await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
    items: [{ id: item.id, price: newPriceId }],
    proration_behavior: "always_invoice",
    metadata: { userId, planId: newPlanId },
  });

  // Update DB immediately (webhook will also update, idempotent)
  await prisma.subscription.update({
    where: { userId },
    data: { planId: newPlanId },
  });
}

export async function syncSubscriptionStatus(
  stripeSubscriptionId: string
): Promise<void> {
  const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);

  const item = sub.items?.data?.[0];
  const periodStart = item
    ? new Date(item.current_period_start * 1000)
    : null;
  const periodEnd = item ? new Date(item.current_period_end * 1000) : null;

  await prisma.subscription.update({
    where: { stripeSubscriptionId },
    data: {
      status: sub.status,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
  });
}
