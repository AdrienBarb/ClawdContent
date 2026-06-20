import { prisma } from "@/lib/db/prisma";
import { stripe } from "@/lib/stripe/client";
import {
  syncSubscriptionStatus,
  PROFILE_GRACE_STATUSES,
} from "@/lib/services/subscription";
import { cleanupUserProfile, purgeZernioProfile } from "@/lib/services/profile";
import { sendDunningEmail, DUNNING_STAGE } from "@/lib/services/dunning";
import { listProfiles } from "@/lib/late/mutations";

// ---------------------------------------------------------------------------
// Shared lifecycle service. Pure-ish business logic called by the Inngest crons
// in src/inngest/functions/lifecycle.ts. Grep prefix: [lifecycle:*].
// ---------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;

/** Reap a non-converting/churned user's Zernio profile after this much idle. */
const REAP_INACTIVE_DAYS = 7;

/** Dunning ladder timing (days since the subscription first went past_due). */
const DUNNING_REMINDER_DAY = 1; // J1 → reminder email
const DUNNING_FINAL_DAY = 3; // J3 → final warning email
const DUNNING_CANCEL_DAY = 7; // J7 → force-cancel (cutoff)

/** Internal/admin/test accounts the reaper must never touch. */
const INTERNAL_EMAILS = new Set<string>(["admin@postclaw.io"]);
function isInternalEmail(email: string): boolean {
  return INTERNAL_EMAILS.has(email) || email.endsWith("@postclaw.io");
}

// ===========================================================================
// Reaper — non-converting / churned users with a lingering Zernio profile
// ===========================================================================

/**
 * Users eligible for reaping: they still have a Zernio profile (DB late_profile),
 * are NOT entitled (no active/past_due/trialing subscription — past_due is in
 * dunning grace and excluded), the account is older than the window, there's
 * been no session activity in the window, and they're not an internal account.
 */
export async function listReapableUserIds(now = new Date()): Promise<string[]> {
  const cutoff = new Date(now.getTime() - REAP_INACTIVE_DAYS * DAY_MS);
  const users = await prisma.user.findMany({
    where: {
      lateProfile: { isNot: null },
      createdAt: { lt: cutoff },
      sessions: { none: { updatedAt: { gt: cutoff } } },
      OR: [
        { subscription: { is: null } },
        {
          subscription: {
            status: { notIn: [...PROFILE_GRACE_STATUSES] },
          },
        },
      ],
    },
    select: { id: true, email: true },
  });
  return users.filter((u) => !isInternalEmail(u.email)).map((u) => u.id);
}

/**
 * Reap one user: tear down their Zernio side + local profile rows (keeping the
 * User row), and — for a non-converter still in onboarding — pin the stored step
 * back to Connect (step 2) so a return lands there, since their accounts are gone.
 */
export async function reapUser(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { onboardingCompletedAt: true },
  });
  await cleanupUserProfile(userId);
  if (user && user.onboardingCompletedAt === null) {
    await prisma.user.update({
      where: { id: userId },
      data: { onboardingStep: 2 },
    });
  }
  console.log(`[lifecycle:reaper] reaped user ${userId}`);
}

// ===========================================================================
// Reconcile — pull Stripe truth into the DB + escalate dunning
// ===========================================================================

/** Stripe ids of subscriptions worth reconciling (skip already-canceled). */
export async function listReconcilableSubscriptionIds(): Promise<string[]> {
  const subs = await prisma.subscription.findMany({
    where: { status: { not: "canceled" } },
    select: { stripeSubscriptionId: true },
  });
  return subs.map((s) => s.stripeSubscriptionId);
}

/**
 * Reconcile one subscription against Stripe, then advance the dunning ladder.
 * Returns a short status string for logging. Never throws.
 */
export async function reconcileSubscription(
  stripeSubscriptionId: string,
  now = new Date()
): Promise<string> {
  // 1) Pull truth from Stripe into the DB (status/period/cancelAtPeriodEnd).
  try {
    await syncSubscriptionStatus(stripeSubscriptionId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(
      `[lifecycle:reconcile] sync failed ${stripeSubscriptionId}: ${msg}`
    );
    return "sync-failed";
  }

  // 2) Re-read post-sync state for dunning decisions.
  const sub = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId },
    select: {
      status: true,
      pastDueSince: true,
      dunningStage: true,
      user: { select: { name: true, email: true } },
    },
  });
  if (!sub) return "not-found";

  // Recovered → ensure the ladder is cleared (defensive; webhook normally does it).
  if (sub.status === "active") {
    if (sub.pastDueSince || sub.dunningStage !== DUNNING_STAGE.NONE) {
      await prisma.subscription.update({
        where: { stripeSubscriptionId },
        data: { pastDueSince: null, dunningStage: DUNNING_STAGE.NONE },
      });
    }
    return "active";
  }

  if (sub.status !== "past_due") return sub.status;

  // The whole point of this backstop: if the invoice.payment_failed webhook was
  // missed, the status synced to past_due but pastDueSince is still null. Stamp
  // it now so the ladder (and the J7 cutoff) measures from first detection —
  // otherwise the user would be stuck past_due forever (never dunned, never
  // canceled, never reaped).
  let pastDueSince = sub.pastDueSince;
  let dunningStage = sub.dunningStage;
  if (!pastDueSince) {
    pastDueSince = now;
    dunningStage = Math.max(dunningStage, DUNNING_STAGE.INITIAL);
    await prisma.subscription.update({
      where: { stripeSubscriptionId },
      data: { pastDueSince, dunningStage },
    });
  }

  return escalateDunning(
    { stripeSubscriptionId, pastDueSince, dunningStage, user: sub.user },
    now
  );
}

/**
 * Advance the dunning ladder for a past_due subscription. Cancels at the J7
 * cutoff; otherwise sends the next due-and-unsent email. The stage is CLAIMED in
 * the DB (atomic updateMany guarded on `dunningStage < target`) BEFORE the email
 * is sent, so a concurrent/retried run can't double-send — the DB, not Resend's
 * idempotency window, is the source of truth for "already escalated".
 */
async function escalateDunning(
  sub: {
    stripeSubscriptionId: string;
    pastDueSince: Date;
    dunningStage: number;
    user: { name: string | null; email: string };
  },
  now: Date
): Promise<string> {
  const days = Math.floor(
    (now.getTime() - sub.pastDueSince.getTime()) / DAY_MS
  );

  // J7 — hard cutoff. Cancel in Stripe (fires subscription.deleted → cleanup)
  // AND tear down locally now, so cleanup never depends solely on the webhook.
  if (days >= DUNNING_CANCEL_DAY) {
    try {
      await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        `[lifecycle:reconcile] cancel failed ${sub.stripeSubscriptionId}: ${msg}`
      );
      return "cancel-failed";
    }
    const local = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: sub.stripeSubscriptionId },
      select: { userId: true },
    });
    if (local) {
      await cleanupUserProfile(local.userId);
      await prisma.subscription.update({
        where: { stripeSubscriptionId: sub.stripeSubscriptionId },
        data: { status: "canceled" },
      });
    }
    return `canceled (day ${days})`;
  }

  // Otherwise send the next sequential email that is both DUE and UNSENT, so a
  // missed cron day never skips a rung (reminder always precedes final).
  let stage: "reminder" | "final" | null = null;
  let target: number = DUNNING_STAGE.NONE;
  if (
    days >= DUNNING_REMINDER_DAY &&
    sub.dunningStage < DUNNING_STAGE.REMINDER
  ) {
    stage = "reminder";
    target = DUNNING_STAGE.REMINDER;
  } else if (
    days >= DUNNING_FINAL_DAY &&
    sub.dunningStage < DUNNING_STAGE.FINAL
  ) {
    stage = "final";
    target = DUNNING_STAGE.FINAL;
  }

  if (stage) {
    // Claim the rung atomically; only the run that advances it sends the email.
    const claim = await prisma.subscription.updateMany({
      where: {
        stripeSubscriptionId: sub.stripeSubscriptionId,
        dunningStage: { lt: target },
      },
      data: { dunningStage: target },
    });
    if (claim.count > 0) {
      await sendDunningEmail(sub.user, stage, sub.stripeSubscriptionId);
      return `${stage}-sent (day ${days})`;
    }
  }

  return `past_due (day ${days}, stage ${sub.dunningStage})`;
}

// ===========================================================================
// Orphan backstop — Zernio profiles with no matching DB late_profile
// ===========================================================================

/**
 * Zernio `postclaw-*` profile ids that have no matching DB late_profile — left
 * behind by a missed cancellation webhook or a hard-deleted user. Safe to purge.
 */
export async function findOrphanZernioProfileIds(): Promise<string[]> {
  const [profiles, dbProfiles] = await Promise.all([
    listProfiles(),
    prisma.lateProfile.findMany({ select: { lateProfileId: true } }),
  ]);
  const known = new Set(dbProfiles.map((p) => p.lateProfileId));
  return profiles
    .filter((p) => p.name.startsWith("postclaw-") && !known.has(p.id))
    .map((p) => p.id);
}

/** Purge one orphan Zernio profile (no DB rows exist for it). */
export async function purgeOrphanProfile(profileId: string): Promise<void> {
  await purgeZernioProfile(profileId);
  console.log(`[lifecycle:orphan] purged orphan Zernio profile ${profileId}`);
}
