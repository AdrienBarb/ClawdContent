import { inngest } from "../client";
import {
  listReconcilableSubscriptionIds,
  reconcileSubscription,
  findOrphanZernioProfileIds,
  purgeOrphanProfile,
  listReapableUserIds,
  reapUser,
} from "@/lib/services/lifecycle";

/**
 * Daily billing reconciler + dunning escalator + orphan-profile backstop.
 *
 * 1) Re-sync every non-canceled subscription's status from Stripe (catches
 *    missed webhooks → no more zombie `past_due`) and escalate the dunning
 *    ladder by age: J1 reminder, J3 final warning, J7 force-cancel.
 * 2) Purge any Zernio profile with no matching DB late_profile (catches a
 *    cancellation whose cleanup never ran).
 *
 * Per-item step.run isolates failures so one bad subscription/profile doesn't
 * kill the run. Steps return only short status strings — never secrets.
 * Grep prefix: [lifecycle:reconcile].
 */
export const reconcileBilling = inngest.createFunction(
  { id: "reconcile-billing", retries: 2, triggers: [{ cron: "0 4 * * *" }] },
  async ({ step }) => {
    const subIds = await step.run("list-subscriptions", () =>
      listReconcilableSubscriptionIds()
    );

    let reconciled = 0;
    let failed = 0;
    for (const id of subIds) {
      try {
        const result = await step.run(`reconcile-${id}`, () =>
          reconcileSubscription(id)
        );
        console.log(`[lifecycle:reconcile] sub=${id} → ${result}`);
        reconciled += 1;
      } catch (err) {
        failed += 1;
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[lifecycle:reconcile] failed sub=${id}: ${msg}`);
      }
    }

    const orphanIds = await step.run("find-orphan-profiles", () =>
      findOrphanZernioProfileIds()
    );

    let purged = 0;
    for (const profileId of orphanIds) {
      try {
        await step.run(`purge-orphan-${profileId}`, () =>
          purgeOrphanProfile(profileId)
        );
        purged += 1;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(
          `[lifecycle:reconcile] orphan purge failed profile=${profileId}: ${msg}`
        );
      }
    }

    return {
      subscriptions: subIds.length,
      reconciled,
      failed,
      orphansFound: orphanIds.length,
      orphansPurged: purged,
    };
  }
);

/**
 * Weekly reaper: deprovision the Zernio profile of non-converting / churned
 * users idle > 7 days. Keeps the User row (and their brand knowledge) and pins
 * onboarding back to Connect for non-converters — lazy provisioning recreates
 * the profile transparently if they return. Grep prefix: [lifecycle:reaper].
 */
export const reapInactiveProfiles = inngest.createFunction(
  {
    id: "reap-inactive-profiles",
    retries: 2,
    triggers: [{ cron: "0 5 * * 1" }],
  },
  async ({ step }) => {
    const userIds = await step.run("list-reapable", () =>
      listReapableUserIds()
    );

    let reaped = 0;
    let failed = 0;
    for (const userId of userIds) {
      try {
        await step.run(`reap-${userId}`, () => reapUser(userId));
        reaped += 1;
      } catch (err) {
        failed += 1;
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[lifecycle:reaper] failed user=${userId}: ${msg}`);
      }
    }

    return { candidates: userIds.length, reaped, failed };
  }
);
