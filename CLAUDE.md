# CLAUDE.md

## What is PostClaw?

PostClaw is an AI social media manager for small business owners — photographers, caterers, coaches, consultants, artists, and local businesses. It learns your brand, plans your content, and publishes to your social accounts. No dashboard, no editor, no learning curve.

**Target audience (ICP):** Non-tech small business owners who need help with social media but can't afford a marketing agency ($2K+/mo). NOT indie hackers or SaaS founders — they churn.

**Positioning:** PostClaw is a social media *manager*, not a tool. The AI tells you what to post and posts it for you. Core value prop: "Tell me what to post and post it for me." Lead with Instagram/Facebook (dominant platforms among real users), not "9 platforms."

**Voice:** Speak their language — no startup jargon, no "founders", no "autopilot." Think: "Would a photographer or a caterer in Leeds understand this?"

**How it works:**

1. User signs up → LateProfile (Zernio) auto-created via Better Auth `user.create.after` hook
2. Onboarding: user enters website URL (scraped via Firecrawl) or business description → AI extracts a `knowledgeBase` → user validates / edits
3. User connects social accounts (free, no subscription needed)
4. First connect kicks off insights analysis + one batch of post suggestions (Inngest)
5. User reviews suggestions on `/d`, edits, schedules, and publishes
6. User subscribes via Stripe for unlimited use (single plan, $49/mo)

**Pricing:** One plan only — `pro` at $49/mo (or 30% off yearly). Legacy `starter` / `business` IDs still resolve to `pro` for old subscribers.

**Key services:**

- **Vercel AI SDK** + **Anthropic Claude** — `generateObject()` for insights inference and post suggestions. Call sites currently hard-code `claude-sonnet-4-6`; `src/lib/ai/provider.ts` exports a shared `claude-haiku-4-5-20251001` model that is **not** used yet (drift to clean up).
- **Zernio** (zernio.com) — Unified social media API (9 platforms)
- **Inngest** — Background workflows (account analysis, insights refresh)
- **Sanity** — Headless CMS for blog and competitor-comparison content
- **Vercel** — Hosting (Next.js)

---

## Architecture

```
User ── Web Dashboard (Next.js on Vercel)
            ├── Better Auth (magic link + Google OAuth)
            ├── Stripe (single $49 plan + webhook)
            ├── Zernio API (account connect + post compose + analytics)
            ├── Inngest (account/connected, account/refresh-insights)
            ├── Anthropic (Sonnet 4.6 at call sites — insights + suggestions + rewrites)
            ├── PostgreSQL (Supabase via Prisma 7 + adapter-pg)
            └── Sanity (blog + alternatives content)
```

**Per-user isolation:** Each user gets a profile-scoped Zernio API key that can only access their own social accounts. One master Zernio account, many scoped keys (created on signup in `ensureUserProfile`).

**There is no chat interface.** The dashboard is suggestion + compose driven. The Vercel AI SDK is used non-interactively (`generateObject` for structured output).

---

## Tech Stack

- **Next.js 16** (App Router) + TypeScript + React 19
- **Vercel AI SDK** (`ai` + `@ai-sdk/anthropic`) — `generateObject` only, no streaming chat
- **Anthropic Claude Sonnet 4.6** (`claude-sonnet-4-6`) at every call site. A shared Haiku 4.5 model in `src/lib/ai/provider.ts` is exported but currently unused.
- **Prisma 7** + PostgreSQL (Supabase) via `@prisma/adapter-pg`
- **Better Auth** (magic links via Resend + Google OAuth)
- **Stripe** SDK v20 (API version `2026-01-28.clover`)
- **Inngest** for background workflows
- **Sanity** (`next-sanity`) for blog content
- **Resend** + React Email (transactional emails)
- **Brevo** (lifecycle automation)
- **React Query** via `useApi` hook
- **Tailwind CSS v4** + shadcn/ui + `@phosphor-icons/react`
- **PostHog** (`posthog-js` + `posthog-node`)
- **Cloudinary** (media uploads)
- **Firecrawl** (`@mendable/firecrawl-js`) — onboarding website scrape
- **Zustand** (`stores/errorStore.ts`) + **nuqs** (URL state)

---

## Data Model

```
User (1:1) ── Subscription
     (1:1) ── LateProfile (1:N) ── SocialAccount (1:N) ── PostSuggestion
     (1:N) ── Media
     (1:N) ── Session
     (1:N) ── Account     // Better Auth provider/password records
```

| Model            | Purpose                                                                       |
| ---------------- | ----------------------------------------------------------------------------- |
| **User**         | Auth user + onboarding fields: `timezone`, `websiteUrl`, `businessDescription`, `knowledgeBase` (JSON), `postsPublished` |
| **Session**      | Better Auth session                                                           |
| **Account**      | Better Auth provider/password account                                         |
| **Verification** | Better Auth verification tokens                                               |
| **Subscription** | Stripe: `stripeCustomerId`, `stripeSubscriptionId`, `status`, `planId`, period dates, `cancelAtPeriodEnd` |
| **LateProfile**  | User's Zernio profile: `lateProfileId`, scoped `lateApiKey`, `profileName` (directory + model name are legacy "Late") |
| **SocialAccount**| Connected platform: `lateAccountId`, `platform`, `username`, `status` (`active`/`disconnected`), `analysisStatus` (`pending`/`analyzing`/`completed`), `insights` (JSON), `lastAnalyzedAt` |
| **PostSuggestion** | Generated idea: `content`, `contentType` (text/image/carousel), `suggestedDay` (0=Mon), `suggestedHour`, `reasoning`, `mediaUrl`, `mediaType` |
| **Media**        | Cloudinary upload record: `cloudinaryId`, `url`, `resourceType`, `format`, `bytes`, `width`, `height` |
| **StripeEvent**  | Webhook idempotency (just the event ID + `processedAt`)                       |

Schema: `src/lib/db/schema.prisma`. No enums — status fields are plain strings with comments. `knowledgeBase` is `Json?` and may be `null` (triggers `/onboarding` redirect).

---

## Project Structure

```
src/
├── app/
│   ├── (home)/                       # Public pages (Navbar + Footer)
│   │   ├── page.tsx                  # Landing
│   │   ├── blog/                     # Sanity-backed blog (list, [slug], category/[slug])
│   │   ├── alternatives/             # Competitor comparison ([slug] + index)
│   │   ├── affiliates/               # Affiliate program + RevenueSimulator
│   │   ├── privacy/, terms/          # Legal
│   │   └── layout.tsx, loading.tsx
│   ├── (dashboard)/                  # Auth-guarded layout (redirects to / or /onboarding)
│   │   ├── layout.tsx                # Sidebar shell + LegacyKBBanner + TimezoneSync
│   │   └── d/
│   │       ├── page.tsx              # PublishPage (suggestions + compose) — default view
│   │       ├── posts/                # Published / scheduled / draft list
│   │       ├── channels/[channelId]/ # Per-channel feed
│   │       ├── accounts/             # Connect/disconnect/reconnect/remove + /callback
│   │       ├── analytics/            # AnalyticsDashboard
│   │       ├── media/                # Cloudinary library
│   │       ├── business/             # Edit knowledgeBase
│   │       ├── billing/              # Plan + ManageSubscriptionButton
│   │       └── settings/             # Timezone preference
│   ├── (onboarding)/onboarding/      # Two-step onboarding (input → validate)
│   ├── api/                          # See API Routes section
│   ├── checkout/success/             # Post-payment redirect
│   ├── layout.tsx, error.tsx, not-found.tsx
│   ├── manifest.ts, robots.ts, sitemap.ts
│   └── globals.css
├── components/
│   ├── ui/                           # shadcn/ui primitives
│   ├── sections/                     # Landing sections (Hero, Pain, BeforeAfter, WhoIsThisFor, HowItWorks, PoweredBy, Pricing, FAQ, FinalCTA)
│   ├── dashboard/                    # PublishPage, Sidebar, AnalyticsDashboard, ContentList, ChannelPage, ConnectAccountButtons, MediaUploadModal, BillingUnsubscribed, ChangePlanSection, SubscribeModal, UpgradeModal, TimezoneSync, LegacyKBBanner
│   ├── blog/                         # Sanity renderers (BlogPortableText, BlogPostCard, BlogCategoryCard, BlogTableOfContents, BlogFAQ)
│   ├── affiliates/RevenueSimulator.tsx
│   ├── tracking/PostHogProvider.tsx
│   ├── providers/                    # Context providers (React Query, etc.)
│   ├── Navbar.tsx, Footer.tsx, PricingCards.tsx, SignInModal.tsx, GlobalErrorHandler.tsx
├── lib/
│   ├── ai/
│   │   ├── provider.ts               # Anthropic Haiku 4.5 model export
│   │   └── rewrite.ts                # Prompt builder for post rewrites (shorten/casual/professional/hashtag/fix)
│   ├── late/                         # Zernio API (directory name is legacy)
│   │   ├── client.ts                 # lateRequest wrapper, master + scoped key support
│   │   └── mutations.ts              # createProfile, createScopedApiKey, getConnectUrl, deleteAccount, listPosts, getPost, getAnalytics, getBestTimeToPost, getFollowerStats, getPostingFrequency, getAccountsHealth, etc.
│   ├── insights/
│   │   ├── extract.ts                # Pure functions: hashtags, voice stats, content mix, primary metric ranking
│   │   └── platformConfig.ts         # Per-platform config (9 platforms): primaryMetric, charLimit, defaultBestTimes, noExternalHistory
│   ├── services/
│   │   ├── user.ts                   # User CRUD wrappers
│   │   ├── profile.ts                # ensureUserProfile / cleanupUserProfile / formatUserContext / buildAccountsContext
│   │   ├── accounts.ts               # getConnectUrl, syncAccountsFromLate (fires reconnect refresh-insights), disconnectAccount, removeAccount
│   │   ├── accountInsights.ts        # computeInsights — three-zone insights with cross-platform voice borrowing
│   │   ├── postSuggestions.ts        # generateSuggestions — Claude generates 5 ideas from cached insights
│   │   ├── zernioContext.ts          # gatherAccountContext — per-platform Zernio fetcher (handles 402/403)
│   │   ├── analytics.ts              # Overview/top-posts/best-times/follower-growth aggregations
│   │   ├── posts.ts                  # CRUD wrapper around Zernio posts (list/get/delete/retry/unpublish/update)
│   │   ├── subscription.ts           # createCheckoutSession, createPortalSession, changePlan, syncSubscriptionStatus
│   │   ├── media.ts                  # Cloudinary upload save + listing + delete
│   │   └── email.ts                  # Brevo: createBrevoContact, trackSignupCompleted, trackSubscriptionStarted, updateBrevoContact
│   ├── schemas/                      # Zod: accounts, analytics, checkout, common, insights (v2 three-zone), knowledgeBase, media, posts, user
│   ├── sanity/                       # client.ts, image.ts, queries.ts, types.ts (blog + competitor pages)
│   ├── better-auth/                  # auth.ts, auth-client.ts
│   ├── stripe/client.ts              # API version 2026-01-28.clover
│   ├── db/                           # prisma.ts (adapter-pg client), schema.prisma, seed.ts
│   ├── constants/                    # appRouter, errorMessage, plans (single $49 pro plan + legacy resolution), platforms.tsx (9 platforms with icons + brand colors)
│   ├── errors/errorHandler.ts
│   ├── hooks/                        # useApi (React Query), useDashboardStatus, useTimezoneSync
│   ├── brevo/client.ts
│   ├── resend/resendClient.ts
│   ├── cloudinary/upload.ts
│   ├── firecrawl/client.ts
│   ├── emails/                       # MagicLinkEmail, WelcomeEmail, AccountDisconnectedEmail (React Email)
│   ├── api/axiosInstance.ts          # Axios with errorStore mapping
│   ├── stores/errorStore.ts          # Zustand error store
│   ├── tracking/                     # distinctId, postHogClient, utm
│   ├── seo/genPageMetadata.ts
│   └── config.ts                     # Imports config.json
├── inngest/
│   ├── client.ts                     # Inngest({ id: "postclaw" })
│   ├── index.ts                      # Functions registry
│   └── functions/analyze-account.ts  # analyzeAccount + refreshInsights
├── proxy.ts                          # Next 16 proxy: distinct-id + UTM cookies. Auth lives in route handlers + (dashboard)/layout.tsx
├── data/                             # faq.ts, siteMetadata.ts
└── utils/environments.ts             # isProduction / isStaging / isDevelopment
```

---

## API Routes

All routes live under `src/app/api/`. Auth = Better Auth session check unless noted.

| Route                              | Methods | Auth | Purpose                                                       |
| ---------------------------------- | ------- | ---- | ------------------------------------------------------------- |
| `/api/auth/[...all]`               | All     | Var  | Better Auth handler                                           |
| `/api/checkout`                    | POST    | Yes  | Create Stripe Checkout session                                |
| `/api/dashboard/status`            | GET     | Yes  | Polling endpoint (accounts, subscription, plan)               |
| `/api/user/timezone`               | POST    | Yes  | Update user timezone                                          |
| `/api/onboarding/analyze`          | POST    | Yes  | Scrape website (Firecrawl) + Claude extract knowledgeBase     |
| `/api/onboarding/confirm`          | POST    | Yes  | Save validated knowledgeBase to user                          |
| `/api/accounts`                    | GET     | Yes  | List connected accounts                                       |
| `/api/accounts/connect`            | POST    | Yes  | Get Zernio OAuth URL for a platform                           |
| `/api/accounts/callback`           | POST    | Yes  | Sync accounts after OAuth (fires `account/connected` Inngest event for new accounts) |
| `/api/accounts/disconnect`         | POST    | Yes  | Revoke OAuth + flip status to disconnected                    |
| `/api/accounts/remove`             | POST    | Yes  | Delete the SocialAccount row (cascades suggestions)           |
| `/api/posts`                       | GET     | Yes  | List user's posts                                             |
| `/api/posts/compose`               | POST    | Yes  | Publish/schedule (per-platform via Zernio)                    |
| `/api/posts/detail`                | GET     | Yes  | Single-post details                                           |
| `/api/posts/update`                | POST    | Yes  | Edit a draft/scheduled post                                   |
| `/api/posts/delete`                | POST    | Yes  | Delete a draft/scheduled post                                 |
| `/api/posts/unpublish`             | POST    | Yes  | Remove a published post                                       |
| `/api/posts/retry`                 | POST    | Yes  | Retry a failed post                                           |
| `/api/posts/actions`               | POST    | Yes  | Batch actions                                                 |
| `/api/posts/rewrite`               | POST    | Yes  | Claude rewrite (shorten/casual/professional/hashtag/fix)      |
| `/api/suggestions`                 | GET     | Yes  | List cached suggestions                                       |
| `/api/suggestions/generate`        | POST    | Yes  | Generate new suggestions (refreshes stale insights inline). `maxDuration = 120s` |
| `/api/suggestions/[id]`            | GET     | Yes  | Get one suggestion                                            |
| `/api/suggestions/[id]/rewrite`    | POST    | Yes  | Claude rewrite a suggestion                                   |
| `/api/analytics`                   | GET     | Yes  | Overview metrics                                              |
| `/api/analytics/posts`             | GET     | Yes  | Top posts                                                     |
| `/api/analytics/best-times`        | GET     | Yes  | Best posting times                                            |
| `/api/analytics/followers`         | GET     | Yes  | Follower growth                                               |
| `/api/media`                       | GET     | Yes  | List user media                                               |
| `/api/media/upload`                | POST    | Yes  | Save Cloudinary upload record                                 |
| `/api/media/delete`                | POST    | Yes  | Delete a Media row                                            |
| `/api/billing/portal`              | GET     | Yes  | Stripe billing portal redirect                                |
| `/api/billing/change-plan`         | POST    | Yes  | Change subscription plan (legacy — single plan today)         |
| `/api/inngest`                     | GET/POST/PUT | No (Inngest) | `serve()` handler for Inngest functions                |
| `/api/webhooks/stripe`             | POST    | No   | Stripe webhook (signature-verified, deduped via `StripeEvent`) |
| `/api/webhooks/zernio`             | POST    | No   | Zernio webhook (HMAC-verified): `account.disconnected` (sends reconnect email), `account.connected`, `post.failed`, `post.partial` |

---

## Dashboard UI

The dashboard is **suggestion + compose driven** (no chat). Users land on `/d` (`PublishPage`).

- **Auth gate** (`(dashboard)/layout.tsx`): Redirects to `/` if no session, to `/onboarding` if `knowledgeBase` is `null`.
- **Sidebar** (`Sidebar.tsx`): Mounts `useDashboardStatus`. Nav items pull from `appRouter`: Posts (`/d`), My Business (`/d/business`), My Accounts list (with connect/settings affordances), Affiliates. User dropdown at bottom: Billing, Settings, Sign out. Mobile: sheet drawer.
- **Main view** (`/d`): `PublishPage` — generate / edit / schedule / publish posts, with media upload via Cloudinary unsigned widget.
- **Channels** (`/d/channels/[channelId]`): Per-account feed.
- **Posts** (`/d/posts`): Cross-account post history (`ContentList`).
- **Accounts** (`/d/accounts` + `/d/accounts/callback`): `ConnectAccountButtons` (one button per platform with brand color + icon).
- **Billing** (`/d/billing`): Plan info + `ManageSubscriptionButton` (Stripe portal).
- **Layout**: Light tinted background `#f3f3f1`, white panel with `md:rounded-2xl` border. Sidebar fixed `md:w-64`.

Supported platforms (9, in `src/lib/insights/platformConfig.ts` + `src/lib/constants/platforms.tsx`): Instagram, Facebook, Twitter/X, Threads, LinkedIn, TikTok, YouTube, Pinterest, Bluesky.

---

## Account Insights & Post Suggestions

Powers account analysis and the "Get ideas" feature. Every field is labelled by source (real Zernio / code-derived / Claude-inferred).

### Architecture

**Core principle: `generateSuggestions()` only runs on user-visible actions** (`/api/suggestions/generate`, `/api/suggestions/from-brief`). Never in silent background jobs — including the connect-time analyze flow. The user-facing suggestion IDs stay stable until the user themselves triggers a refresh.

```
First connect (Inngest analyzeAccount):
  account/connected →
    compute-insights (source: external)
    if syncTriggered: sleep 60s → compute-insights-after-sync   (max 2 calls, no loop)
    mark-analysis-completed   ← flips as soon as insights are saved

Reconnect / backfill (Inngest refreshInsights):
  account/refresh-insights →
    compute-insights (source: all)
    mark-analysis-completed (idempotent: pending → completed)
                             ← suggestions are NOT touched

User clicks "Get ideas" (/api/suggestions/generate, maxDuration 120s):
  if insights null or > 7 days old → computeInsights() inline (synchronous, source: all)
  generateSuggestions()
```

Three services, single source of truth per concern:

| Service | Responsibility |
|---|---|
| `zernioContext.ts` | Fetch + format raw Zernio data per platform (account, posts, analytics, best-times, posting frequency, followers). Handles 402/403 gracefully. |
| `accountInsights.ts` | `computeInsights` writes `insights` + `lastAnalyzedAt` only — does NOT touch `analysisStatus`. Cross-platform voice borrowing for cold-start. Returns `null` if account no longer exists. |
| `postSuggestions.ts` | `generateSuggestions` reads cached insights as-is, asks Claude for 5 suggestions, saves rows. Only called from user-visible routes (`/api/suggestions/generate`, `/api/suggestions/from-brief`) — never from Inngest. Never triggers refreshes — freshness is the caller's responsibility. |

### Insights v2 schema (three zones, `src/lib/schemas/insights.ts`)

`SocialAccount.insights` is JSON validated by Zod. Three zones make data provenance explicit:

| Zone | Source | Examples |
|---|---|---|
| `zernio` | Real Zernio API | `followersCount`, `growth30d`, `topPosts[].metrics`, `bestTimes`, `postingFrequency` |
| `computed` | Code-derived from Zernio | `extractedHashtags` (regex), `voiceStats` (length / emoji % / `?` / links), `contentMix`, `primaryMetric` |
| `inferred` | Claude inference (nullable) | `topics`, `toneSummary`, `performingPatterns`, `confidence` |

Plus `meta`: `version: 2`, `dataQuality` (`rich`/`thin`/`cold_start`/`platform_no_history`), `analyzedAt`, `postsAnalyzed`, `syncTriggered`, `nextRefreshAt`, `voiceBorrowedFromPlatform`.

### Per-platform config (`src/lib/insights/platformConfig.ts`)

| Platform | `primaryMetric` | `noExternalHistory` | `charLimit` | Notes |
|---|---|---|---|---|
| Instagram, Facebook, Twitter, Threads | `likes` | false | 2200 / null / 280 / 500 | Standard engagement |
| TikTok, YouTube | **`views`** | false | 2200 / null | Video — rank by views |
| Pinterest | **`saves`** | false | 500 | Save = success |
| LinkedIn | `likes` | **true** | 3000 | Personal accounts: only Zernio-published posts visible. Skip post fetch on `source: "external"`, fetch on `source: "all"` |
| Bluesky | `likes` | **true** (no analytics) | 300 | `supportsAnalytics: false` |

`defaultBestTimes` per platform used when `bestTimes` is null (cold-start). `dayOfWeek` is 0=Monday in this codebase (also matches Zernio).

### Cross-platform voice borrowing

When a platform is cold-start (LinkedIn personal first scan, Bluesky, or any with 0 posts), `accountInsights` looks at the user's other `SocialAccount`s under the same `LateProfile` for one with `dataQuality: "rich"`. If found, it borrows the `inferred` zone (topics, tone, patterns) but forces `confidence: "low"` and sets `meta.voiceBorrowedFromPlatform`.

### Anthropic structured-output gotcha

**Anthropic `generateObject` rejects both `minItems` and `maxItems` on arrays.** Never put `.length()`, `.min()`, or `.max()` on a Zod array sent to Claude. Trim/validate in code instead.

Pattern: define two schemas when caps matter — one Claude-safe (no constraints) and one for internal validation. See `inferredZoneClaudeSchema` vs `inferredZoneSchema` in `src/lib/schemas/insights.ts`.

### Inngest functions (`src/inngest/functions/analyze-account.ts`)

| Function ID | Trigger event | Steps |
|---|---|---|
| `analyze-account` | `account/connected` | compute-insights → (if syncTriggered) sleep 60s + compute-insights-after-sync → mark-analysis-completed (retries: 3) |
| `refresh-insights` | `account/refresh-insights` | compute-insights (`source: all`) → mark-analysis-completed (retries: 2) |

`analysisStatus` flips `analyzing` → `completed` as soon as insights are saved. Suggestions are NOT generated by Inngest — they're created on demand when the user clicks "Get ideas" (`/api/suggestions/generate`) or starts from a brief (`/api/suggestions/from-brief`). `refreshInsights` is idempotent (`completed` → `completed`, `pending` → `completed`).

`computeInsights` and `generateSuggestions` both exit cleanly if the SocialAccount has been deleted (`findUnique` + null guard) — avoids retry loops on stale events.

### Debug logging

Grep-friendly prefixes: `[zernio:raw]`, `[zernioContext]`, `[insights:claude:prompt]`, `[insights:claude:output]`, `[insights:final]`, `[suggestions:cache]`, `[suggestions:claude:prompt]`, `[suggestions:claude:output]`, `[accounts] 🔄 reconnect detected`, `[Zernio Webhook]`, `[analyze-account]`.

```bash
npm run dev | grep -E "\[zernio|\[insights|\[suggestions"
```

---

## Service Layer

Services live in `src/lib/services/`. Routes call services; services call adapters (`src/lib/late/`, `src/lib/stripe/`, `src/lib/brevo/`, `src/lib/firecrawl/`, `src/lib/cloudinary/`).

### Key flows

**User signup (Better Auth `databaseHooks.user.create.after`):**
1. PostHog identify + `user_signed_up` capture (with UTM from cookie)
2. `ensureUserProfile` → Zernio `createProfile` + `createScopedApiKey` → save `LateProfile`
3. `createBrevoContact` + `trackSignupCompleted` (fires Brevo onboarding automation)

**Onboarding (`/onboarding` two-step form):**
1. Step 1 (input): website URL or business description → `POST /api/onboarding/analyze` (Firecrawl scrape → Claude extracts business info)
2. Step 2 (validate): user edits → `POST /api/onboarding/confirm` saves `knowledgeBase` to `User`
3. Redirect to `/d`

**Account connect:**
1. `POST /api/accounts/connect` → `getConnectUrl` (Zernio OAuth URL)
2. User completes OAuth → returns to `/d/accounts/callback`
3. Frontend calls `POST /api/accounts/callback` → `syncAccountsFromLate` (uses `getAccountsHealth` for `tokenValid` + `needsReconnect`) → upsert SocialAccount rows
4. New accounts → fire `account/connected` Inngest event (analyzeAccount). Reconnects (`disconnected → active`) → fire `account/refresh-insights` (refreshInsights only).

**Subscription (Stripe webhook on `checkout.session.completed`):**
1. Upsert `Subscription` (resolve plan via `getPlanFromStripePriceId`)
2. Idempotent `ensureUserProfile`
3. `trackSubscriptionStarted` Brevo automation

**Deprovisioning (Stripe webhook on `customer.subscription.deleted`):**
1. `Subscription.status → "canceled"`, `updateBrevoContact`
2. Background `cleanupUserProfile` (delete SocialAccounts + LateProfile) via `next/server`'s `after()`

---

## Stripe Webhooks

Handler: `src/app/api/webhooks/stripe/route.ts`. Signature-verified. Deduped via `StripeEvent.id` unique insert.

| Event                           | Action                                              |
| ------------------------------- | --------------------------------------------------- |
| `checkout.session.completed`    | Upsert subscription, ensure profile, Brevo subscription_started |
| `customer.subscription.created` | Idempotent upsert                                   |
| `customer.subscription.updated` | Sync status, plan, period dates, `cancelAtPeriodEnd` |
| `customer.subscription.deleted` | Status → canceled, Brevo update, cleanup profile in `after()` |
| `invoice.payment_succeeded`     | Update period dates                                 |
| `invoice.payment_failed`        | Status → `past_due` (do NOT deprovision; Stripe retries) |

---

## Environment Variables

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

# Zernio (master key — falls back to LATE_API_KEY for legacy)
ZERNIO_API_KEY=
LATE_API_KEY=                    # Legacy alias, optional
ZERNIO_WEBHOOK_SECRET=           # HMAC-SHA256 for /api/webhooks/zernio

# Inngest
INNGEST_EVENT_KEY=               # Required in cloud mode (scripts must pass eventKey + isDev:false)

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

---

## Commands

```bash
npm run dev                    # Start dev server
npm run build                  # Build for production
npm run vercel-build           # prisma generate + (prod) prisma migrate deploy + next build
npm run lint                   # ESLint
npm run db:generate            # prisma generate
npm run db:migrate             # prisma migrate dev
npm run db:push                # prisma db push
npm run db:studio              # Prisma Studio
npm run email:dev              # React Email preview server
npm run backfill:insights      # tsx scripts/backfill-insights.ts (--apply)

# One-off scripts (require dotenv)
tsx scripts/check-accounts.ts  # Inspect SocialAccount metadata by id(s)
tsx scripts/insights-stats.ts  # Aggregate analysisStatus / status counts
tsx scripts/inspect-user.ts    # Look up a user by email + their accounts
```

---

## Coding Standards

### Core Principles

1. **Type Safety First**: Always use TypeScript. Avoid `any`.
2. **Server Components Default**: Client Components only for interactivity.
3. **Thin API routes**: Validate input → call service → return response. No business logic in routes.
4. **Service layer**: All business logic in `src/lib/services/`.
5. **No barrel imports**: Import directly from source, never through index.ts.

### File Naming

- **Components**: PascalCase (`PublishPage.tsx`)
- **Utilities/Hooks/Services**: camelCase (`profile.ts`, `useApi.ts`)
- **Constants**: UPPER_SNAKE_CASE inside files

### API Route Pattern

```typescript
import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json(
        { error: errorMessages.UNAUTHORIZED },
        { status: 401 }
      );
    }

    const body = await req.json();
    const data = someSchema.parse(body);
    const result = await someService({ userId: session.user.id, data });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return errorHandler(error);
  }
}
```

### Client-Side Data Fetching

Use the `useApi` hook (`src/lib/hooks/useApi.ts`) — wraps React Query with the axios instance and the global error store. `useDashboardStatus` is a pre-built hook for the polling status endpoint.

```typescript
const { useGet, usePost } = useApi();
const { data } = useGet("/api/accounts");
const { mutate } = usePost("/api/accounts/connect", { onSuccess: () => { ... } });
```

### Styling

- Tailwind CSS v4 + shadcn/ui from `@/components/ui/`
- Dashboard: tinted background `#f3f3f1`, white floating panel with `md:rounded-2xl` border
- Cards: `rounded-2xl`, soft borders, white background
- Platform config (icon + brand color) lives in `src/lib/constants/platforms.tsx`
- Match existing design — don't introduce new colors without approval

---

## Key Technical Notes

### Prisma 7 (driver adapter)

- `prisma.config.ts` loads `.env` via dotenv and points the CLI at `DIRECT_URL` (used by `migrate`, `generate`).
- Runtime client uses `@prisma/adapter-pg`: `new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) })`. In production, SSL is enabled with `rejectUnauthorized: false`.
- `schema.prisma` has no `url` field; the constructor takes no `datasourceUrl` — adapter is the only path.
- Schema lives at `src/lib/db/schema.prisma`.

### Stripe SDK v20 (2026 API)

- API version: `2026-01-28.clover`.
- Period dates on subscription **items** (`sub.items.data[0].current_period_start`), not on the subscription.
- Invoice subscription via `invoice.parent?.subscription_details?.subscription`.
- Webhooks deduped through `StripeEvent` (insert event ID, swallow unique violation).

### Zernio API (formerly Late)

- Base URL: `https://zernio.com/api/v1`.
- Client: `src/lib/late/client.ts` (directory + DB model named "Late" for legacy reasons).
- Master key falls back: `process.env.ZERNIO_API_KEY ?? process.env.LATE_API_KEY`.
- Profile-scoped API keys for per-user isolation.
- `publishNow: true` required for immediate posts (default is draft).
- `day_of_week`: 0=Monday (matches `platformConfig.defaultBestTimes`).
- Media types: `image/video/gif/document` (not MIME types).
- Webhook (`/api/webhooks/zernio`) verifies HMAC-SHA256 with `ZERNIO_WEBHOOK_SECRET`.

### Vercel AI SDK

- `generateObject` only — there is no streaming chat surface.
- Provider: `@ai-sdk/anthropic`. Call sites pass `anthropic("claude-sonnet-4-6")` inline (insights, suggestions, rewrites, onboarding analyze). The shared `src/lib/ai/provider.ts` exports `claude-haiku-4-5-20251001` but **no call site imports it** — drift between intent and reality.
- Used for: insights inference (`accountInsights.ts`), post suggestions (`postSuggestions.ts`), rewrites (`api/posts/rewrite`, `api/suggestions/[id]/rewrite`), onboarding extraction (`api/onboarding/analyze`).
- **No `minItems` / `maxItems` on arrays** sent to Claude — see Anthropic gotcha above.

### Inngest

- Client: `new Inngest({ id: "postclaw" })`.
- Endpoint: `src/app/api/inngest/route.ts` exports `serve({ client, functions })`.
- Two functions today: `analyze-account` (`account/connected`), `refresh-insights` (`account/refresh-insights`).
- One-off scripts that send Inngest events must explicitly construct `new Inngest({ id, eventKey: INNGEST_EVENT_KEY, isDev: false })` — env var alone silently drops events.

### Media Upload (Cloudinary)

- Cloudinary unsigned upload widget on the client (in `PublishPage.tsx` and `MediaUploadModal.tsx`).
- Cloud name from `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`.
- Server-side admin SDK in `src/lib/cloudinary/upload.ts` and `src/lib/services/media.ts`.
- After upload, the client posts the metadata to `/api/media/upload` to insert a `Media` row.

### PostHog

- Server: `posthog-node` via `src/lib/tracking/postHogClient.ts`. `captureServerEvent`, `identifyUser`.
- Client: `posthog-js` in `src/components/tracking/PostHogProvider.tsx`.
- `src/proxy.ts` sets a `postclaw_distinct_id` cookie (UUID, 1y TTL) and a `postclaw_utm` first-touch cookie (30d TTL) on first visit.
- `user_signed_up` captured in Better Auth `databaseHooks.user.create.after`, with UTM data attached.

### Sanity

- Read-only client in `src/lib/sanity/client.ts` (uses `NEXT_PUBLIC_SANITY_PROJECT_ID` + `NEXT_PUBLIC_SANITY_DATASET`).
- GROQ queries in `src/lib/sanity/queries.ts`. Types in `src/lib/sanity/types.ts`.
- Powers `/blog`, `/blog/[slug]`, `/blog/category/[slug]`, `/alternatives`, `/alternatives/[slug]`. PortableText rendering in `components/blog/BlogPortableText.tsx`.

### Proxy (Next 16)

- `src/proxy.ts` (Next 16 convention; replaces `middleware.ts`).
- Sets `postclaw_distinct_id` (anonymous, 1 year, httpOnly) and `postclaw_utm` (first-touch, 30 days, httpOnly).
- **Auth is NOT enforced here.** Auth lives in route handlers and `(dashboard)/layout.tsx`.
- Matcher excludes `api`, `_next/static`, `_next/image`, `favicon.ico`.

### Dashboard Layout

- Root layout (`app/layout.tsx`): providers only (no Navbar/Footer).
- `(home)/layout.tsx`: public-page chrome.
- `(dashboard)/layout.tsx`: redirects to `/` (no session) or `/onboarding` (no `knowledgeBase`); sidebar shell + `LegacyKBBanner` + `TimezoneSync`.
- `(onboarding)/`: bare layout — used while `knowledgeBase === null`.

---

## Configuration

App config in `config.json`:

- Project name, description, tagline, URL, logo, favicon
- SEO metadata (title: "PostClaw - Your AI Social Media Manager")
- Contact info (`no-reply@postclaw.io`, `admin@postclaw.io`)
- Pricing meta (single plan, 30% yearly discount). Plan definition itself lives in `src/lib/constants/plans.ts`.
- Feature flags (auth: magic link + email/password; payments: stripe; waitlist: disabled)

---

## Important: External Communication

Never mention Anthropic, Claude, OpenAI, or any AI provider in user-facing content. Use "proprietary AI engine" or "our AI" instead. Internal code/docs can use actual tech names.
