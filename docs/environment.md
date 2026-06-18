# Environment Variables

```env
# Database (Supabase PostgreSQL)
DATABASE_URL=                    # Used by adapter-pg at runtime
DIRECT_URL=                      # Used by Prisma CLI (prisma.config.ts)

# Supabase Storage (media bucket)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
# Local dev only — make generated media URLs publicly reachable so Zernio can
# fetch post images (local Supabase runs on a 127.0.0.1 loopback Zernio can't
# reach, which fails post validation with "Image URL must be publicly reachable").
# Leave both UNSET in prod (cloud Supabase serves its own public domain).
SUPABASE_PUBLIC_URL=                 # Public base for emitted media URLs, e.g. https://postclaw.ngrok.app
LOCAL_SUPABASE_STORAGE_ORIGIN=       # Proxy target if the tunnel hits the Next app, e.g. http://127.0.0.1:54521

# Authentication
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=
NEXT_PUBLIC_BASE_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Payments (Stripe)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_POSTCLAW_99_MONTHLY=   # Current $99/mo price — all new checkouts
# Legacy (still resolved for old subscribers, optional):
STRIPE_PRICE_POSTCLAW_MONTHLY=      # old $49/mo
STRIPE_PRICE_POSTCLAW_YEARLY=       # old yearly
STRIPE_PRICE_PRO_MONTHLY=
STRIPE_PRICE_PRO_YEARLY=
STRIPE_PRICE_STARTER_MONTHLY=
STRIPE_PRICE_STARTER_YEARLY=
STRIPE_PRICE_BUSINESS_MONTHLY=
STRIPE_PRICE_BUSINESS_YEARLY=
# Paywall A/B intro-discount coupon (optional). When set, the "discount" variant
# of the onboarding paywall (PostHog flag `paywall-intro-discount`, 50/50) shows
# "$49 first month, then $99/mo" and auto-applies this coupon at checkout. Create
# in Stripe as amount_off $50.00, duration: once, scoped to the $99 price. Leave
# UNSET to keep everyone on full-price control (the $49 copy can never show
# without a real coupon behind it).
STRIPE_COUPON_POSTCLAW_INTRO=

# Email (Resend — single email provider: magic links, digests, alerts)
RESEND_API_KEY=
RESEND_AUDIENCE_ID=              # Optional — marketing contact list sync (signup/removal)

# AI — text (Anthropic)
ANTHROPIC_API_KEY=               # Read by @ai-sdk/anthropic provider

# AI — media (Google Gemini, single provider for ALL generated media)
GEMINI_API_KEY=                  # Nano Banana Pro/2 images + Veo 3.1 Fast Reels

# Autopilot
AUTOPILOT_ACTION_SECRET=         # HMAC secret for one-click digest action links
                                 # (falls back to BETTER_AUTH_SECRET if unset)

# Website Scraping (Firecrawl, onboarding only)
FIRECRAWL_API_KEY=

# Zernio
ZERNIO_API_KEY=                  # Master key
LATE_API_KEY=                    # Legacy alias, optional fallback
ZERNIO_WEBHOOK_SECRET=           # HMAC-SHA256 for /api/webhooks/zernio

# Inngest
INNGEST_EVENT_KEY=               # Required in cloud mode (CLI scripts must pass eventKey + isDev:false)

# Sanity (blog content)
NEXT_PUBLIC_SANITY_PROJECT_ID=
NEXT_PUBLIC_SANITY_DATASET=

# Analytics (PostHog)
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=

# App
NEXT_PUBLIC_APP_ENV=             # production / staging / development
NEXT_PUBLIC_API_URL=             # Used by axiosInstance baseURL
```
