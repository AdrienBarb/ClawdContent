import { resendClient } from "@/lib/resend/resendClient";
import config from "@/lib/config";
import {
  PaymentFailedEmail,
  type DunningStage,
} from "@/lib/emails/PaymentFailedEmail";

/**
 * Numeric dunning ladder, persisted on `Subscription.dunningStage` so escalation
 * never double-sends. 0 = healthy/none. Each value = the highest email sent.
 */
export const DUNNING_STAGE = {
  NONE: 0,
  INITIAL: 1, // J0 — first failed invoice (sent from the webhook)
  REMINDER: 2, // J1 — sent by the daily reconcile cron
  FINAL: 3, // J3 — final warning, sent by the daily reconcile cron
} as const;

const SUBJECTS: Record<DunningStage, string> = {
  initial: "Your payment didn't go through",
  reminder: "Reminder: your payment is still failing",
  final: "Last reminder — your account closes tomorrow",
};

function firstNameFrom(name: string | null | undefined, email: string): string {
  const first = (name ?? "").trim().split(/\s+/)[0];
  return first || email.split("@")[0];
}

/**
 * Send a dunning email for the given stage. Idempotent per
 * (subscription, stage) via the Resend idempotencyKey, and never throws — a
 * failed send must not break the webhook or the reconcile cron.
 */
export async function sendDunningEmail(
  user: { name: string | null; email: string },
  stage: DunningStage,
  stripeSubscriptionId: string
): Promise<void> {
  const billingUrl = `${config.project.url}/d/billing`;
  try {
    const { error } = await resendClient.emails.send(
      {
        from: config.contact.email,
        to: user.email,
        subject: SUBJECTS[stage],
        react: PaymentFailedEmail({
          firstName: firstNameFrom(user.name, user.email),
          billingUrl,
          stage,
        }),
        tags: [{ name: "category", value: "dunning" }],
      },
      { idempotencyKey: `dunning/${stripeSubscriptionId}/${stage}` }
    );
    if (error) {
      console.error(
        `[lifecycle:dunning] ${stage} email error for ${user.email}: ${error.message}`
      );
      return;
    }
    console.log(`[lifecycle:dunning] sent ${stage} email to ${user.email}`);
  } catch (err) {
    console.error(
      `[lifecycle:dunning] ${stage} send threw: ${err instanceof Error ? err.message : err}`
    );
  }
}
