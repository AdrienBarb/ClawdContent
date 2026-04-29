import { prisma } from "@/lib/db/prisma";
import { stripe } from "@/lib/stripe/client";
import { getTopupPriceId } from "@/lib/constants/plans";

// Returns a Stripe Checkout URL for the Boost pack (one-time, never expires).
// The amount of allowance granted is anchored to the constant in
// constants/usage.ts and validated against the priceId in the webhook —
// metadata is *not* trusted for the amount.
export async function createTopupCheckoutSession(
  userId: string,
  email: string
): Promise<string> {
  const existing = await prisma.subscription.findUnique({
    where: { userId },
    select: { stripeCustomerId: true },
  });

  let customerId = existing?.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email,
      metadata: { userId },
    });
    customerId = customer.id;
  }

  const priceId = getTopupPriceId();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/d?topup=success`,
    cancel_url: `${baseUrl}/d`,
    // The webhook switches on `metadata.type === "topup"` to grant
    // points onto the user's ledger. The grant amount itself is NOT taken
    // from metadata (security) — the webhook validates the priceId and
    // grants the constant TOPUP_PACK_POINTS.
    metadata: {
      type: "topup",
      userId,
    },
  });

  if (!session.url) {
    throw new Error("Failed to create top-up checkout session");
  }
  return session.url;
}
