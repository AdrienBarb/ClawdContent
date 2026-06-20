import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { magicLink } from "better-auth/plugins";
import { prisma } from "@/lib/db/prisma";
import { resendClient } from "@/lib/resend/resendClient";
import { MagicLinkEmail } from "@/lib/emails/MagicLinkEmail";
import config from "@/lib/config";
import { captureServerEvent, identifyUser } from "@/lib/tracking/postHogClient";
import { getDistinctIdFromHeader } from "@/lib/tracking/distinctId";
import { getUtmFromCookieHeader } from "@/lib/tracking/utm";
import { createMarketingContact } from "@/lib/services/email";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
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
  databaseHooks: {
    user: {
      create: {
        after: async (user, ctx) => {
          const cookieHeader = ctx?.headers?.get?.("cookie") ?? "";
          const anonId = getDistinctIdFromHeader(cookieHeader);
          const distinctId = anonId ?? user.id;

          // Identify the canonical user id — NOT the anonymous id. Identifying
          // the anon id would flag it `is_identified`, which blocks the later
          // client-side `posthog.identify(userId)` from merging the anonymous
          // browsing person into the user (identified→identified merges are
          // rejected). Keeping the anon id un-identified makes that a clean
          // anon→identified merge. `user_signed_up` still fires on the anon id
          // below, so it stitches into the user via that client merge.
          await identifyUser(user.id, {
            email: user.email,
            name: user.name,
          });

          const utmData = getUtmFromCookieHeader(cookieHeader);

          await captureServerEvent(distinctId, "user_signed_up", {
            userId: user.id,
            email: user.email,
            authMethod: ctx?.path?.includes("callback") ? "oauth" : "email",
            ...(utmData && {
              utm_source: utmData.utm_source,
              utm_medium: utmData.utm_medium,
              utm_campaign: utmData.utm_campaign,
              utm_content: utmData.utm_content,
              utm_term: utmData.utm_term,
              $referrer: utmData.referrer,
            }),
          });

          // NOTE: the Zernio profile is provisioned lazily on the first social
          // connect (see getConnectUrl), NOT at signup — most signups never
          // reach the connect step, so creating a profile here just generates
          // orphans for the reaper to clean. Lazy provisioning + the reaper keep
          // the master Zernio account free of unused profiles/keys.

          // Resend audience: keep the marketing contact list in sync
          await createMarketingContact({
            email: user.email,
            name: user.name,
          });
        },
      },
    },
  },
  baseURL:
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "http://localhost:3000",
  secret: (() => {
    const secret = process.env.BETTER_AUTH_SECRET;
    if (!secret) {
      throw new Error("BETTER_AUTH_SECRET environment variable is required");
    }
    return secret;
  })(),
  trustedOrigins: [
    process.env.BETTER_AUTH_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      "http://localhost:3000",
  ],
});
