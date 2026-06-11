import { resendClient } from "@/lib/resend/resendClient";

// Marketing-contact sync lives on Resend Audiences (Brevo was removed
// 2026-06-11 — Resend is the single email provider). Every function is a
// best-effort no-op when RESEND_AUDIENCE_ID isn't configured: transactional
// email never depends on this.
const RESEND_AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID;

/** Add a contact to the main audience on signup. */
export async function createMarketingContact(user: {
  email: string;
  name?: string | null;
}) {
  if (!RESEND_AUDIENCE_ID) return;
  try {
    const [firstName, ...rest] = (user.name ?? "").trim().split(/\s+/);
    await resendClient.contacts.create({
      email: user.email,
      firstName: firstName || undefined,
      lastName: rest.join(" ") || undefined,
      unsubscribed: false,
      audienceId: RESEND_AUDIENCE_ID,
    });
  } catch (error) {
    console.error("Failed to create Resend contact:", error);
  }
}

/** Remove a contact from the audience (e.g. on account deletion). */
export async function removeMarketingContact(email: string) {
  if (!RESEND_AUDIENCE_ID) return;
  try {
    await resendClient.contacts.remove({
      email,
      audienceId: RESEND_AUDIENCE_ID,
    });
  } catch (error) {
    console.error("Failed to remove Resend contact:", error);
  }
}
