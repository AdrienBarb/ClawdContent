import { prisma } from "@/lib/db/prisma";
import { stripe } from "@/lib/stripe/client";

export async function createCheckoutSession(
  userId: string,
  email: string
): Promise<string> {
  const existing = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (existing && existing.status === "active") {
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

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    throw new Error("Missing STRIPE_PRICE_ID environment variable");
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/d`,
    cancel_url: `${baseUrl}/d/subscribe`,
    metadata: { userId },
    subscription_data: {
      metadata: { userId },
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
