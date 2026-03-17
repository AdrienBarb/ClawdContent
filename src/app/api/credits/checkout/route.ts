import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe/client";
import { creditTopUpSchema } from "@/lib/schemas/credits";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) {
      return NextResponse.json(
        { error: errorMessages.UNAUTHORIZED },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { quantity } = creditTopUpSchema.parse(body);

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: 100, // $1 per credit
            product_data: {
              name: "Image Generation Credits",
              description: `${quantity} image generation credit${quantity > 1 ? "s" : ""}`,
            },
          },
          quantity,
        },
      ],
      metadata: {
        userId: session.user.id,
        type: "credit_topup",
        quantity: String(quantity),
      },
      success_url: `${baseUrl}/d/credits?payment=success`,
      cancel_url: `${baseUrl}/d/credits`,
    });

    if (!checkoutSession.url) {
      throw new Error("Failed to create checkout session");
    }

    return NextResponse.json({ url: checkoutSession.url }, { status: 200 });
  } catch (error) {
    return errorHandler(error);
  }
}
