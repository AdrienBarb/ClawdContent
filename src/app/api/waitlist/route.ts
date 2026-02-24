import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { render } from "@react-email/render";
import { WaitlistConfirmationEmail } from "@/lib/emails/WaitlistConfirmationEmail";
import { resendClient } from "@/lib/resend/resendClient";
import { errorHandler } from "@/lib/errors/errorHandler";
import { waitlistSchema } from "@/lib/schemas/common";
import { checkRateLimit } from "@/lib/ratelimit/checkRateLimit";
import { emailLimiter } from "@/lib/ratelimit/client";
import config from "@/lib/config";

export async function POST(request: NextRequest) {
  try {
    // Rate limit check
    const rateLimit = await checkRateLimit(request, emailLimiter);
    if (!rateLimit.success) return rateLimit.response;

    const body = await request.json();
    const { email, name } = waitlistSchema.parse(body);

    const existing = await prisma.waitlist.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Email already on waitlist" },
        { status: 400 }
      );
    }

    const totalCount = await prisma.waitlist.count();

    const waitlistEntry = await prisma.waitlist.create({
      data: {
        email,
        name,
        position: totalCount + 1,
      },
    });

    if (config.features.waitlist?.confirmationEmail !== false) {
      try {
        const emailHtml = await render(
          WaitlistConfirmationEmail({
            email: waitlistEntry.email,
            position: waitlistEntry.position!,
          })
        );

        await resendClient.emails.send({
          from: config.contact.email,
          to: email,
          subject: `You're on the ${config.project.name} waitlist!`,
          html: emailHtml,
        });
      } catch (emailError) {
        console.error(
          "Failed to send waitlist confirmation email:",
          emailError
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        position: waitlistEntry.position,
        message: "You've been added to the waitlist!",
      },
      { status: 201 }
    );
  } catch (error) {
    return errorHandler(error);
  }
}
