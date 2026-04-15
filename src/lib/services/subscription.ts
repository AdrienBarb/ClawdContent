import { prisma } from "@/lib/db/prisma";
import { stripe } from "@/lib/stripe/client";
import {
  type PlanId,
  type BillingInterval,
  getPlan,
  getStripePriceId,
  getPlanImageCredits,
} from "@/lib/constants/plans";
import {
  handlePlanUpgrade,
  handlePlanDowngrade,
} from "@/lib/services/credits";
import { updateMachineAutoStop } from "@/lib/fly/mutations";

export async function createCheckoutSession(
  userId: string,
  email: string,
  planId: PlanId,
  interval: BillingInterval,
  affonsoReferral?: string
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
  const plan = getPlan(planId);

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    allow_promotion_codes: true,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/d?payment=success`,
    cancel_url: `${baseUrl}/d`,
    metadata: {
      userId,
      planId,
      ...(affonsoReferral && { affonso_referral: affonsoReferral }),
    },
    subscription_data: {
      metadata: { userId, planId },
      ...(plan.hasTrial && { trial_period_days: plan.trialDays }),
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

  const oldPlanId = subscription.planId as PlanId;

  // Update DB immediately (webhook will also update, idempotent)
  await prisma.subscription.update({
    where: { userId },
    data: { planId: newPlanId },
  });

  // Adjust credits based on plan change direction
  const oldCredits = getPlanImageCredits(oldPlanId);
  const newCredits = getPlanImageCredits(newPlanId);
  if (newCredits > oldCredits) {
    await handlePlanUpgrade(userId, oldPlanId, newPlanId);
  } else if (newCredits < oldCredits) {
    await handlePlanDowngrade(userId, newPlanId);
  }

  // Update container auto-stop and plan env var based on new plan
  const alwaysOnPlans: PlanId[] = ["pro", "business"];
  const shouldAutoStop = !alwaysOnPlans.includes(newPlanId);
  await updateMachineAutoStop(userId, shouldAutoStop).catch((err) =>
    console.error(`Failed to update auto-stop for user ${userId}:`, err)
  );

  // Sync PLAN_ID env var so the bot knows the user's plan
  const { updateContainerEnvVars } = await import(
    "@/lib/services/provisioning"
  );
  await updateContainerEnvVars(userId, { PLAN_ID: newPlanId }).catch((err) =>
    console.error(`Failed to update PLAN_ID for user ${userId}:`, err)
  );
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
