import { prisma } from "@/lib/db/prisma";
import { stripe } from "@/lib/stripe/client";
import {
  type PlanId,
  type BillingInterval,
  getStripePriceId,
} from "@/lib/constants/plans";

export async function createCheckoutSession(
  userId: string,
  email: string,
  planId: PlanId,
  interval: BillingInterval,
  affonsoReferral?: string,
  successUrl?: string
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

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    allow_promotion_codes: true,
    line_items: [{ price: priceId, quantity: 1 }],
    // Defense-in-depth against open redirect: only honour a same-origin
    // relative path (the schema already enforces this at the boundary).
    success_url:
      successUrl && successUrl.startsWith("/") && !/^\/[/\\]/.test(successUrl)
        ? `${baseUrl}${successUrl}`
        : `${baseUrl}/d?payment=success`,
    cancel_url: `${baseUrl}/d`,
    metadata: {
      userId,
      planId,
      ...(affonsoReferral && { affonso_referral: affonsoReferral }),
    },
    // Hard paywall: no trial — the first charge happens at checkout.
    subscription_data: {
      metadata: { userId, planId },
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

// The amount actually billed on the live Stripe subscription. Legacy
// subscribers keep grandfathered prices ($49/mo, old yearly plans) that no
// longer match the PLANS constant — never display plan.monthlyPrice as "what
// you pay" without checking this first.
export async function getSubscriptionPrice(
  stripeSubscriptionId: string
): Promise<{ amount: number; interval: "month" | "year" } | null> {
  try {
    const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
    const price = sub.items.data[0]?.price;
    if (price?.unit_amount == null) return null;
    return {
      amount: price.unit_amount / 100,
      interval: price.recurring?.interval === "year" ? "year" : "month",
    };
  } catch {
    return null;
  }
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
