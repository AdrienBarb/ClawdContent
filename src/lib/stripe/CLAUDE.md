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

Single plan today: `pro` at $49/mo (or 30% off yearly). Legacy IDs (`starter`, `business`) still resolve to `pro` for old subscribers via `getPlanFromStripePriceId` in `src/lib/constants/plans.ts`.
