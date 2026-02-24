import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { magicLink } from "better-auth/plugins";
import { prisma } from "@/lib/db/prisma";
import { resendClient } from "@/lib/resend/resendClient";
import { MagicLinkEmail } from "@/lib/emails/MagicLinkEmail";
import config from "@/lib/config";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        try {
          const result = await resendClient.emails.send({
            from: config.contact.email,
            to: email,
            subject: `Sign in to ${config.project.name}`,
            react: MagicLinkEmail({
              magicLink: url,
            }),
          });

          if (result.error) {
            console.error("Resend API error:", result.error);
            throw new Error(
              `Failed to send email: ${result.error.message || JSON.stringify(result.error)}`
            );
          }
        } catch (error) {
          console.error("Error sending magic link email:", error);
          if (error instanceof Error) {
            throw new Error(`Email send failed: ${error.message}`);
          }
          throw error;
        }
      },
    }),
  ],
  baseURL:
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "http://localhost:3000",
  secret:
    process.env.BETTER_AUTH_SECRET || "change-this-secret-key-in-production",
  trustedOrigins: [
    process.env.BETTER_AUTH_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      "http://localhost:3000",
  ],
});
