# Environment Variables

```env
# Database (Supabase PostgreSQL)
DATABASE_URL=                    # Used by adapter-pg at runtime
DIRECT_URL=                      # Used by Prisma CLI (prisma.config.ts)

# Authentication
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=
NEXT_PUBLIC_BASE_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Payments (Stripe)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_POSTCLAW_MONTHLY=
STRIPE_PRICE_POSTCLAW_YEARLY=
# Legacy (still resolved for old subscribers, optional):
STRIPE_PRICE_PRO_MONTHLY=
STRIPE_PRICE_PRO_YEARLY=
STRIPE_PRICE_STARTER_MONTHLY=
STRIPE_PRICE_STARTER_YEARLY=
STRIPE_PRICE_BUSINESS_MONTHLY=
STRIPE_PRICE_BUSINESS_YEARLY=

# Email (Resend — magic links + transactional)
RESEND_API_KEY=

# Email Automation (Brevo)
BREVO_API_KEY=
BREVO_LIST_ID=

# AI (Anthropic)
ANTHROPIC_API_KEY=               # Read by @ai-sdk/anthropic provider

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

# Media (Cloudinary)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# App
NEXT_PUBLIC_APP_ENV=             # production / staging / development
NEXT_PUBLIC_API_URL=             # Used by axiosInstance baseURL
```
