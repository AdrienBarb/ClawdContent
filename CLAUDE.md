# CLAUDE.md

## What is PostClaw?

PostClaw is an AI social media manager for small business owners — photographers, caterers, coaches, consultants, artists, and local businesses. It learns your brand, plans your content, and publishes to your social accounts from a single chat conversation. No dashboard, no editor, no learning curve. Plans start at $17/mo.

**Target audience (ICP):** Non-tech small business owners who need help with social media but can't afford a marketing agency ($2K+/mo). NOT indie hackers or SaaS founders — they churn.

**Positioning:** PostClaw is a social media *manager*, not a tool. The AI tells you what to post and posts it for you. Core value prop: "Tell me what to post and post it for me." Lead with Instagram/Facebook (dominant platforms among real users), not "9 platforms."

**Voice:** Speak their language — no startup jargon, no "founders", no "autopilot." Think: "Would a photographer or a caterer in Leeds understand this?"

**How it works:**

1. User signs up → LateProfile (Zernio) auto-created
2. Onboarding: user enters website URL (scraped via Firecrawl) or business description
3. AI analyzes and builds knowledgeBase → user validates extracted data
4. User connects social accounts (free, no subscription needed)
5. User gets 1 free chat message to try the AI
6. User subscribes via Stripe for unlimited access
7. User chats with their AI social media manager to create and publish content

**Key services:**

- **Vercel AI SDK** — `streamText()` with tool calling in Next.js API routes
- **Anthropic Claude** — LLM powering the AI (claude-sonnet-4-6)
- **Zernio** (zernio.com) — Unified social media API (9 platforms)
- **Vercel** — Hosting (Next.js)

---

## Architecture

```
User ─── Web Chat (Next.js on Vercel) ─── Anthropic Claude (via AI SDK)
                                                  │
                                                  └── Zernio API tools (10 tools)

Dashboard (Next.js on Vercel)
    ├── Stripe (payments)
    ├── Zernio API (account connections + social posting)
    └── PostgreSQL (Supabase)
```

**Per-user isolation:** Each user gets a **profile-scoped Zernio API key** that can only access their own social accounts. One master Zernio account, many scoped keys.

**AI Architecture:**
- System prompt built dynamically from DB on each request (user context, accounts, capabilities)
- 10 typed AI SDK tools wrap Zernio API mutations
- `stepCountIs(10)` limits agent loops
- Anti-hallucination rules in system prompt (exact number reporting, no fabrication)

---

## Tech Stack

- **Next.js 16** (App Router) + TypeScript + React 19
- **Vercel AI SDK** (`ai` + `@ai-sdk/anthropic` + `@ai-sdk/react`)
- **Anthropic Claude Sonnet 4.6** — LLM
- **Prisma 7** + PostgreSQL (Supabase)
- **Better Auth** (magic links + Google OAuth)
- **Stripe** (subscriptions)
- **Resend** + React Email (transactional emails)
- **React Query** via `useApi` hook
- **Tailwind CSS v4** + shadcn/ui
- **PostHog** (analytics)
- **Cloudinary** (media uploads)
- **Firecrawl** (website scraping for onboarding)

---

## Data Model

```
User (1:1) ── Subscription
     (1:1) ── LateProfile (1:N) ── SocialAccount
     (1:N) ── ChatMessage
     (1:N) ── Media
     (1:N) ── Session
     (1:N) ── Account
```

| Model             | Purpose                                                                    |
| ----------------- | -------------------------------------------------------------------------- |
| **User**          | Authenticated user (Better Auth)                                           |
| **Subscription**  | Stripe subscription: customerId, subscriptionId, status, period dates      |
| **LateProfile**   | User's Zernio profile: profileId, scoped API key (model name is legacy)    |
| **SocialAccount** | Connected social platform: accountId, platform, username, status           |
| **ChatMessage**   | Persisted chat messages (role, content, userId)                             |
| **Media**         | Uploaded media: cloudinaryId, url, resourceType, format, bytes, dimensions |
| **CreditBalance** | User credit balance: planCredits, topUpCredits                             |
| **Session**       | Auth session                                                               |
| **Account**       | OAuth/password account info                                                |

Schema: `src/lib/db/schema.prisma`

---

## Project Structure

```
src/
├── app/
│   ├── (home)/                    # Public pages (with Navbar + Footer)
│   │   ├── page.tsx               # Landing page
│   │   ├── privacy/               # Privacy policy
│   │   └── terms/                 # Terms of service
│   ├── (dashboard)/               # Protected dashboard layout (sidebar)
│   │   ├── layout.tsx             # Sidebar + auth guard
│   │   └── d/
│   │       ├── page.tsx           # Chat (default view)
│   │       ├── accounts/          # Social accounts (connect/disconnect)
│   │       │   └── callback/      # OAuth return handler
│   │       ├── business/          # Edit business info (knowledgeBase)
│   │       ├── billing/           # Subscription info
│   │       └── subscribe/         # Stripe checkout card
│   ├── api/
│   │   ├── auth/[...all]/         # Better Auth
│   │   ├── checkout/              # Stripe Checkout session
│   │   ├── chat/                  # AI chat (streamText + tools)
│   │   ├── media/upload/          # Media upload callback (POST)
│   │   ├── accounts/              # List accounts (GET)
│   │   ├── accounts/connect/      # Zernio OAuth URL (POST)
│   │   ├── accounts/callback/     # Sync after OAuth (POST)
│   │   ├── accounts/disconnect/   # Disconnect account (POST)
│   │   ├── accounts/remove/       # Remove account (POST)
│   │   ├── analytics/             # Analytics endpoints
│   │   ├── onboarding/analyze/     # Scrape website + AI analysis (POST)
│   │   ├── onboarding/confirm/    # Save knowledgeBase (POST)
│   │   ├── dashboard/status/      # Dashboard polling endpoint (GET)
│   │   └── webhooks/stripe/       # Stripe webhooks
│   └── checkout/success/          # Post-payment redirect
├── components/
│   ├── ui/                        # shadcn/ui
│   ├── sections/                  # Landing page sections
│   ├── dashboard/                 # Dashboard components
│   │   ├── Sidebar.tsx            # Dark sidebar navigation
│   │   ├── ChatWithLoader.tsx     # Thin wrapper → ChatInterface
│   │   ├── ChatInterface.tsx      # AI chat with streaming + media upload + paywall
│   │   ├── ConnectAccountButtons.tsx # Platform connect buttons with icons
│   │   ├── AnalyticsDashboard.tsx # Analytics charts
│   │   └── ContentList.tsx        # Published content list
│   └── providers/                 # Context providers
├── lib/
│   ├── ai/                        # AI SDK integration
│   │   ├── provider.ts            # Anthropic provider config
│   │   ├── system-prompt.ts       # Dynamic system prompt builder
│   │   └── tools.ts              # 10 Zernio tools as AI SDK tools
│   ├── firecrawl/                 # Firecrawl website scraping client
│   ├── late/                      # Zernio API client + mutations (directory name is legacy)
│   ├── insights/                  # Account insights utilities
│   │   ├── extract.ts             # Pure functions: hashtags, voice stats, content mix, primary metric
│   │   └── platformConfig.ts      # Per-platform config (primary metric, defaults, char limits)
│   ├── services/                  # Business logic
│   │   ├── profile.ts            # LateProfile creation/cleanup
│   │   ├── subscription.ts        # Stripe checkout + sync
│   │   ├── accounts.ts           # Social account CRUD + sync (fires reconnect refresh)
│   │   ├── accountInsights.ts     # Compute v2 insights from Zernio + cross-platform voice borrowing
│   │   ├── postSuggestions.ts     # Generate suggestions from cached insights (no Zernio fetch)
│   │   ├── zernioContext.ts       # Per-platform Zernio data fetcher (analytics, best-times, frequency, followers)
│   │   ├── analytics.ts          # Analytics data fetching
│   │   ├── chatMessages.ts       # Chat message persistence
│   │   ├── credits.ts            # Credit balance
│   │   ├── media.ts              # Media upload save + list
│   │   └── email.ts              # Brevo email automation
│   ├── schemas/                   # Zod validation schemas (incl. insights v2 with three zones)
│   ├── better-auth/               # Auth config
│   ├── stripe/                    # Stripe client
│   ├── db/                        # Prisma client + schema
│   ├── constants/
│   │   ├── appRouter.ts           # Centralized route config
│   │   ├── errorMessage.ts        # Error message constants
│   │   ├── plans.ts              # Plan definitions + limits
│   │   └── platforms.tsx          # Social platform icons + brand colors (9 platforms)
│   ├── errors/                    # Error handler
│   ├── hooks/                     # useApi (React Query)
│   ├── brevo/                     # Brevo API client (email automation)
│   ├── resend/                    # Email client
│   └── emails/                    # React Email templates
├── proxy.ts                        # Next 16 proxy convention (was middleware.ts) — distinct-id + UTM cookies. Auth is enforced in route handlers + (dashboard)/layout.tsx, not here
└── data/                           # Static data
```

---

## API Routes

| Route                      | Methods | Auth | Purpose                                    |
| -------------------------- | ------- | ---- | ------------------------------------------ |
| `/api/auth/[...all]`       | All     | Var  | Better Auth                                |
| `/api/checkout`            | POST    | Yes  | Create Stripe Checkout session             |
| `/api/chat`                | POST    | Yes  | AI chat (streamText + Zernio tools)        |
| `/api/media/upload`        | POST    | Yes  | Save media upload record                   |
| `/api/accounts`            | GET     | Yes  | List connected accounts                    |
| `/api/accounts/connect`    | POST    | Yes  | Get Zernio OAuth URL                       |
| `/api/accounts/callback`   | POST    | Yes  | Sync accounts after OAuth                  |
| `/api/accounts/disconnect` | POST    | Yes  | Disconnect a social account                |
| `/api/accounts/remove`     | POST    | Yes  | Remove a social account                    |
| `/api/analytics/*`         | GET     | Yes  | Analytics data (overview, posts, best-times, followers) |
| `/api/dashboard/status`    | GET     | Yes  | Dashboard polling (accounts, subscription, plan) |
| `/api/user/timezone`       | POST    | Yes  | Update user timezone                       |
| `/api/user/context`        | POST    | Yes  | Update user onboarding context             |
| `/api/webhooks/stripe`     | POST    | No   | Stripe webhook handler                     |

---

## Dashboard UI

The dashboard is **chat-first** — users land directly on the chat interface.

- **Sidebar** (`Sidebar.tsx`): Dark navy sidebar (`#151929`) with coral accent (`#e8614d`), nav items: Chat, Content, Analytics, Accounts, Billing. User section at bottom. Mobile: sheet drawer.
- **Chat** (`/d`): `ChatWithLoader` → `ChatInterface` (streaming AI chat via `@ai-sdk/react`). No provisioning step — chat is instant.
- **Paywall**: 1 free message, then modal prompts subscription. Enforced server-side (403 `SUBSCRIPTION_REQUIRED`) + client-side (intercepts send button).
- **Accounts** (`/d/accounts`): Connect/disconnect/reconnect/remove social accounts. Free access (no subscription needed).
- **Connect buttons** (`ConnectAccountButtons.tsx`): Platform icons with brand colors.
- **Content area**: Light gray background (`#f8f9fc`), white rounded cards, `max-w-5xl`.

Supported platforms: **9 social media platforms** via Zernio (Twitter/X, LinkedIn, Bluesky, Threads, Facebook, Instagram, Pinterest, TikTok, YouTube). Media uploads (images/videos) supported via Cloudinary.

---

## AI Chat System

### System Prompt (`src/lib/ai/system-prompt.ts`)

Built fresh from DB on every request. Includes:
- PostClaw identity + capabilities
- User context (name, role, niche, topics, timezone)
- Connected accounts list
- Current date/time
- Anti-hallucination rules (7 critical rules)
- Content guidelines per platform
- "What you CAN do" / "What you CANNOT do" sections

### Tools (`src/lib/ai/tools.ts`)

10 tools wrapping `src/lib/late/mutations.ts`:
- `createPost` — Create and publish/schedule posts (per-platform via `Promise.allSettled`)
- `listPosts` — List user's posts with filtering
- `updatePost` — Update draft/scheduled posts
- `deletePost` — Delete draft/scheduled posts
- `unpublishPost` — Remove published posts from platforms
- `retryPost` — Retry failed posts
- `uploadMedia` — Upload media via Zernio presign
- `getAnalytics` — Get analytics overview
- `getDailyMetrics` — Get daily metrics for charts
- `getBestTimeToPost` — Get optimal posting times (day_of_week: 0=Monday)

### Chat Flow

1. Auth check
2. Fetch user + subscription + LateProfile + messageCount (parallel)
3. No subscription + messageCount >= 1 → 403 `SUBSCRIPTION_REQUIRED`
4. No connected accounts → 400 `NO_CONNECTED_ACCOUNTS`
5. Build system prompt
6. Create tools (with user's scoped API key)
7. `streamText()` with `stepCountIs(10)` safety limit
8. Save messages via `onFinish` callback

---

## Account Insights & Post Suggestions

The system that powers account analysis and the "Get ideas" feature. Designed around **truth in data** — every field is labelled by source (real Zernio / code-derived / Claude-inferred).

### Architecture

**Core principle: `generateSuggestions()` only runs on user-visible actions.** Never in silent background jobs. The user-facing suggestion IDs stay stable until the user themselves triggers a refresh.

```
First connect (Inngest):
  account/connected → analyzeAccount fn:
    compute-insights
    if syncTriggered: sleep 60s → compute-insights-after-sync   (max 2 calls, no loop)
    generate-suggestions    ← ONCE, on the best data we have
    mark-analysis-completed

Reconnect / backfill (Inngest):
  account/refresh-insights → refreshInsights fn:
    compute-insights        ← refresh insights only
    mark-analysis-completed (idempotent: pending → completed)
                            ← suggestions are NOT touched

User clicks "Get ideas":
  /api/suggestions/generate:
    if insights null or > 7 days old → computeInsights() inline (synchronous)
    generateSuggestions()
```

Three services, single source of truth per concern:

| Service | Responsibility |
|---|---|
| `zernioContext.ts` | Fetch + format raw Zernio data per platform (analytics, best-times, posting frequency, follower stats). Handles 402/403 gracefully. |
| `accountInsights.ts` | Compute v2 insights, save to `SocialAccount.insights` (insights + lastAnalyzedAt only — does NOT touch `analysisStatus`). Cross-platform voice borrowing for cold-start. |
| `postSuggestions.ts` | Read cached insights as-is, prompt Claude for 5 suggestions, save. Never triggers refreshes — freshness is the caller's responsibility. |

### Insights v2 schema (three zones, `src/lib/schemas/insights.ts`)

`SocialAccount.insights` is a JSON field validated by Zod. Three zones make data provenance explicit:

| Zone | Source | Examples |
|---|---|---|
| `zernio` | ✅ Real Zernio API | `followersCount`, `growth30d`, `topPosts[].metrics`, `bestTimes`, `postingFrequency` |
| `computed` | 🟡 Code-derived from Zernio | `extractedHashtags` (regex over `content`), `voiceStats` (length/emoji/?/links), `contentMix`, `primaryMetric` |
| `inferred` | 🔮 Claude inference (nullable) | `topics`, `toneSummary`, `performingPatterns`, `confidence` |

Plus `meta`: `version`, `dataQuality` (`rich`/`thin`/`cold_start`/`platform_no_history`), `analyzedAt`, `postsAnalyzed`, `syncTriggered`, `nextRefreshAt`, `voiceBorrowedFromPlatform`.

### Per-platform config (`src/lib/insights/platformConfig.ts`)

| Platform | `primaryMetric` | `noExternalHistory` | Notes |
|---|---|---|---|
| Instagram, Facebook, Twitter, Threads | `likes` | false | Standard engagement |
| TikTok, YouTube | **`views`** | false | Video platforms — rank by views |
| Pinterest | **`saves`** | false | Save = success |
| LinkedIn | `likes` | **true** | Personal accounts: only Zernio-published posts visible. Skip post fetch on `source: "external"`, fetch on `source: "all"` (refresh) |
| Bluesky | `likes` | **true** | No analytics endpoint available |

`defaultBestTimes` per platform used when `bestTimes` is null (cold-start).

### Triggers & flows

| Event | Trigger | Source param | Behaviour |
|---|---|---|---|
| First connect | OAuth callback fires `account/connected` | `external` | Compute insights. If `syncTriggered: true`, sleep 60s + recompute (max once — no loop). Then generate suggestions ONCE. Mark `analysisStatus: completed`. |
| Reconnect | `syncAccountsFromLate` detects `disconnected → active`, fires `account/refresh-insights` | `all` | Silent refresh of insights only. Suggestions are NOT regenerated (the user's visible cards stay stable). |
| "Get ideas" click | `/api/suggestions/generate` | — | If insights null or > 7 days old, run `computeInsights()` **inline** (synchronous, user waits). Then generate suggestions. `maxDuration: 120s`. |
| Disconnect | `disconnectAccount` | — | Status → `disconnected`. Insights kept. No event. |
| Remove | `removeAccount` | — | Row deleted (cascades to suggestions). No event. |
| Re-add after Remove | `syncAccountsFromLate` sees `isNew: true`, fires `account/connected` | `external` | Fresh analysis. |
| Backfill script | `scripts/backfill-insights.ts` fires `account/refresh-insights` | `all` | Refreshes insights + flips `pending → completed`. Does NOT generate suggestions — user must click "Get ideas" to see new ones. |

### Cross-platform voice borrowing

If a platform is cold-start (LinkedIn personal first scan, Bluesky, or any with 0 posts), `accountInsights` looks at the user's other `SocialAccount`s under the same `LateProfile` for one with `dataQuality: "rich"`. If found, it borrows the `inferred` zone (topics, tone, patterns) — but forces `confidence` to `"low"` to signal it's not native.

Result: Casa Lasagna's LinkedIn cold-start uses her Instagram voice instead of being generic.

### Anthropic structured-output gotcha

**Anthropic `generateObject` rejects both `minItems` and `maxItems` on arrays.** Never put `.length()`, `.min()`, or `.max()` on a Zod array sent to Claude. Trim/validate in code instead.

Pattern: define two schemas when caps matter — one Claude-safe (no constraints) and one for internal validation. See `inferredZoneClaudeSchema` vs `inferredZoneSchema` in `src/lib/schemas/insights.ts`.

### Inngest functions (`src/inngest/functions/analyze-account.ts`)

| Function ID | Trigger event | Steps |
|---|---|---|
| `analyze-account` | `account/connected` | compute-insights → (if syncTriggered) sleep 60s + compute-insights-after-sync → generate-suggestions → mark-analysis-completed |
| `refresh-insights` | `account/refresh-insights` | compute-insights (`source: "all"`) → mark-analysis-completed |

`analysisStatus` flips from `analyzing` → `completed` only **after** suggestions exist (in `analyzeAccount`), so the dashboard loader stays up until the user has something to see. `refreshInsights` is idempotent on status (`completed` → `completed`, or `pending` → `completed` for backfilled accounts).

`computeInsights` writes `insights` + `lastAnalyzedAt` only; it intentionally does NOT touch `analysisStatus` — that responsibility lives in the Inngest functions.

Both services use `findUnique` (not `findUniqueOrThrow`) and exit cleanly with a warning if the SocialAccount no longer exists (avoids Inngest retry loops on stale events).

### Debug logging

Consistent prefixes for grep-friendly debugging:

| Prefix | Content |
|---|---|
| `[zernio:raw]` | Full JSON response from each Zernio endpoint |
| `[zernioContext]` | Compact summary (counts, dataQuality decision) |
| `[insights:claude:prompt]` | Full prompt sent to Claude for inference zone |
| `[insights:claude:output]` | Claude's inferred zone JSON |
| `[insights:final]` | Full Insights object before DB write |
| `[suggestions:cache]` | Cached insights read from DB |
| `[suggestions:claude:prompt]` | Full suggestion-generation prompt |
| `[suggestions:claude:output]` | Claude's 5 suggestions JSON |
| `[accounts] 🔄 reconnect detected` | When refresh is triggered after a reconnect |

Run `npm run dev | grep "\[zernio\|\[insights\|\[suggestions"` to follow the full pipeline.

---

## Service Layer

Services live in `src/lib/services/`. Routes call services, services call adapters (`src/lib/late/`, `src/lib/stripe/`).

### Key flows

**User signup (Better Auth `user.create.after` hook):**
1. Create Zernio profile → scoped API key → save LateProfile to DB
2. Create Brevo contact + trigger onboarding automation
3. Capture PostHog event

**Social account connection:**
1. Get Zernio OAuth URL → redirect user
2. On callback, sync accounts from Zernio API → upsert DB

**Subscription (on checkout.session.completed):**
1. Upsert subscription record
2. Ensure LateProfile exists (idempotent)

**Deprovisioning (on subscription.deleted):**
1. Status → canceled
2. Clean up LateProfile + social accounts

---

## Stripe Webhooks

| Event                           | Action                                              |
| ------------------------------- | --------------------------------------------------- |
| `checkout.session.completed`    | Upsert subscription, ensure profile exists          |
| `customer.subscription.created` | Idempotent upsert subscription                      |
| `customer.subscription.updated` | Sync status + period dates                          |
| `customer.subscription.deleted` | Status → canceled, cleanup profile (non-blocking)   |
| `invoice.payment_succeeded`     | Extend period                                       |
| `invoice.payment_failed`        | Status → past_due (do NOT deprovision)              |

---

## Environment Variables

```env
# Database (Supabase PostgreSQL)
DATABASE_URL=
DIRECT_URL=

# Authentication
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=
NEXT_PUBLIC_BASE_URL=

# Payments (Stripe)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=

# Email (Resend)
RESEND_API_KEY=

# Email Automation (Brevo)
BREVO_API_KEY=
BREVO_LIST_ID=

# AI (Anthropic)
ANTHROPIC_API_KEY=

# Website Scraping (Firecrawl)
FIRECRAWL_API_KEY=

# Zernio (master key — not per-user)
ZERNIO_API_KEY=

# Analytics (PostHog)
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=

# Media (Cloudinary)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# App
NEXT_PUBLIC_APP_ENV=
```

---

## Commands

```bash
npm run dev                # Start dev server
npm run build              # Build for production
npm run lint               # ESLint
npx prisma migrate dev     # Run migrations
npx prisma generate        # Generate Prisma client
npx prisma studio          # Prisma Studio GUI
npm run email:dev          # Preview email templates
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

- **Components**: PascalCase (`Sidebar.tsx`)
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
    const session = await auth.api.getSession({
      headers: await headers(),
    });
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

Always use `useApi` hook. Never use axios directly.

```typescript
const { useGet, usePost } = useApi();
const { data } = useGet("/api/accounts");
const { mutate } = usePost("/api/accounts/connect", { onSuccess: () => { ... } });
```

### Styling

- Tailwind CSS v4 + shadcn/ui components from `@/components/ui/`
- Dashboard: dark sidebar with CSS variables (`--sidebar-*`), light content area (`#f8f9fc`)
- Cards: `rounded-2xl`, `border-gray-100`, `shadow-sm`, white background
- Platform config with icons/colors in `src/lib/constants/platforms.tsx`
- Match existing design — don't introduce new colors without approval

---

## Key Technical Notes

### Prisma 7

- Config in `prisma.config.ts` (loads `.env` via dotenv) — used by CLI only (migrate, generate)
- Runtime client uses `@prisma/adapter-pg` driver adapter: `new PrismaClient({ adapter })`
- No `url` in schema.prisma, no `datasourceUrl` in constructor — adapter is the only way
- Schema at `src/lib/db/schema.prisma`

### Stripe SDK v20 (2026 API)

- API version: `2026-01-28.clover`
- Period dates on subscription **items** (`sub.items.data[0].current_period_start`), not on subscription
- Invoice subscription via `invoice.parent?.subscription_details?.subscription`

### Zernio API (formerly Late API)

- Base URL: `https://zernio.com/api/v1`
- Client: `src/lib/late/client.ts` (directory name is legacy)
- Profile-scoped API keys for per-user isolation
- `publishNow: true` required for immediate posts (default is draft)
- `day_of_week`: 0=Monday (not Sunday)
- Media types: `image/video/gif/document` (not MIME types)

### Vercel AI SDK

- `streamText()` with `@ai-sdk/anthropic` provider
- Tools use `inputSchema` (not `parameters`) with Zod schemas
- `stepCountIs(10)` for multi-step agent loops
- `toUIMessageStreamResponse()` for streaming to client
- `@ai-sdk/react` `useChat()` on client side

### Media Upload (Cloudinary)

- `next-cloudinary` package with `CldUploadWidget` in ChatInterface
- Unsigned upload preset: `postclaw_unsigned`, cloud: `postclaw`
- Media saved to `Media` table via `/api/media/upload` (fire-and-forget from client)
- Chat messages include `[MEDIA: <url>]` + `[MEDIA_TYPE: <mime>]` tags
- AI tools can reference media URLs directly in `createPost`

### PostHog A/B Testing

- Server-side experiments via `posthog-node` feature flags
- `src/proxy.ts` sets a `postclaw_distinct_id` cookie (UUID, 1-year TTL) on first visit
- Distinct ID helpers in `src/lib/tracking/distinctId.ts`
- `user_signed_up` event captured in Better Auth `databaseHooks.user.create.after`

### Dashboard Layout

- Root layout (`app/layout.tsx`): providers only, no Navbar/Footer
- Public pages in `(home)/` route group: includes Navbar + Footer
- Dashboard in `(dashboard)/` route group: sidebar layout, no Navbar/Footer
- Sidebar uses CSS custom properties (`--sidebar-bg`, etc.) with inline styles

---

## Configuration

App config is centralized in `config.json`:

- Project name, description, tagline, URL
- SEO metadata (title: "PostClaw — Your AI Social Media Manager")
- Contact info
- Pricing tiers (Starter $17/mo, Pro $37/mo, Business $79/mo)
- Feature flags

---

## Important: External Communication

Never mention Anthropic, Claude, OpenAI, or any AI provider in user-facing content. Use "proprietary AI engine" or "our AI" instead. Internal code/docs can use actual tech names.
