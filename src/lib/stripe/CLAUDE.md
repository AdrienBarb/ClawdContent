# Stripe (SDK v20, API `2026-01-28.clover`)

## SDK quirks

- **Period dates live on the subscription `item`**, not on the subscription:
  ```ts
  sub.items.data[0].current_period_start
  sub.items.data[0].current_period_end
  ```
- **Invoice → subscription** via `invoice.parent?.subscription_details?.subscription`.
- **Webhooks deduped** through `StripeEvent` (insert event ID, swallow unique violation).

## Webhook events

Handler: `src/app/api/webhooks/stripe/route.ts`. Signature-verified.

| Event | Action |
|---|---|
| `checkout.session.completed` | Upsert subscription, `ensureUserProfile` (idempotent), Brevo `subscription_started` |
| `customer.subscription.created` | Idempotent upsert |
| `customer.subscription.updated` | Sync status, plan, period dates, `cancelAtPeriodEnd` |
| `customer.subscription.deleted` | Status → `canceled`, Brevo update, `cleanupUserProfile` in `after()` |
| `invoice.payment_succeeded` | Update period dates |
| `invoice.payment_failed` | Status → `past_due`. **Do NOT deprovision** — Stripe retries. |

## Plan resolution

Single plan today: `pro` at $99/mo, monthly only — no trial, no yearly (both removed 2026-06-10). New checkouts use `STRIPE_PRICE_POSTCLAW_99_MONTHLY`. Legacy IDs (`starter`, `business`) and the old $49 monthly / yearly prices still resolve to `pro` for old subscribers via `getPlanFromStripePriceId` in `src/lib/constants/plans.ts` — grandfathered subscribers keep their old price (use `getSubscriptionPrice` to display what Stripe actually bills).
