# CLAUDE.md

## What is PostClaw?

PostClaw is a SaaS ($39/mo) that gives each user a personal AI content manager on Telegram. Users chat with their bot to create, adapt, and publish social media posts across 4 text-friendly platforms (Twitter/X, LinkedIn, Bluesky, Threads).

**How it works:**
1. User signs up, pays $39/mo via Stripe
2. We auto-provision a private OpenClaw container on Railway + a Late API profile
3. User connects their Telegram bot token and social accounts
4. User chats with their bot on Telegram to create and publish content

**Key services:**
- **OpenClaw** — Open-source AI agent framework (runs in Docker on Railway)
- **Late API** (getlate.dev) — Unified social media API
- **Kimi K2.5** (Moonshot) — LLM powering the bot
- **Railway** — Container hosting (one container per user)

---

## Architecture

```
User ─── Telegram ─── OpenClaw Container (Railway)
                            │
                            ├── Kimi K2.5 (Moonshot API)
                            └── Late API (social posting)

Dashboard (Next.js on Vercel)
    ├── Stripe (payments)
    ├── Railway API (container management)
    ├── Late API (account connections)
    └── PostgreSQL (Supabase)
```

**Per-user isolation:** Each user gets their own Railway container with a **profile-scoped Late API key** that can only access their own social accounts. One master Late account, many scoped keys.

**Custom Docker image:** `ghcr.io/adrienbarb/postclaw-agent:latest`
- Entrypoint generates `openclaw.json` + `SOUL.md` from env vars
- Pre-installs the `late-api` skill from ClawHub
- GitHub Action auto-builds on changes to `docker/openclaw/`

---

## Tech Stack

- **Next.js 16** (App Router) + TypeScript + React 19
- **Prisma 7** + PostgreSQL (Supabase)
- **Better Auth** (magic links + Google OAuth)
- **Stripe** (subscriptions)
- **Resend** + React Email (transactional emails)
- **React Query** via `useApi` hook
- **Tailwind CSS v4** + shadcn/ui
- **PostHog** (analytics)

---

## Data Model

```
User (1:1) ── Subscription
     (1:1) ── RailwayService
     (1:1) ── LateProfile (1:N) ── SocialAccount
     (1:N) ── Session
     (1:N) ── Account
```

| Model | Purpose |
|-------|---------|
| **User** | Authenticated user (Better Auth) |
| **Subscription** | Stripe subscription: customerId, subscriptionId, status, period dates |
| **RailwayService** | User's container: serviceId, environmentId, status, hasTelegramToken |
| **LateProfile** | User's Late API profile: profileId, scoped API key |
| **SocialAccount** | Connected social platform: accountId, platform, username, status |
| **Session** | Auth session |
| **Account** | OAuth/password account info |

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
│   │       ├── page.tsx           # Dashboard home (real-time polling)
│   │       ├── accounts/          # Social accounts
│   │       │   └── callback/      # OAuth return handler
│   │       ├── billing/           # Subscription info
│   │       ├── bot/               # Redirects to /d
│   │       └── subscribe/         # Stripe checkout card
│   ├── api/
│   │   ├── auth/[...all]/         # Better Auth
│   │   ├── checkout/              # Stripe Checkout session
│   │   ├── bot/                   # Bot management (GET/POST/PATCH)
│   │   ├── accounts/              # List accounts (GET)
│   │   ├── accounts/connect/      # OAuth connect URL (POST)
│   │   ├── accounts/callback/     # Sync after OAuth (POST)
│   │   ├── dashboard/status/      # Dashboard polling endpoint (GET)
│   │   ├── provisioning/retry/    # Retry failed provisioning (POST)
│   │   └── webhooks/stripe/       # Stripe webhooks
│   └── checkout/success/          # Post-payment redirect
├── components/
│   ├── ui/                        # shadcn/ui
│   ├── sections/                  # Landing page sections
│   ├── dashboard/                 # Dashboard components
│   │   ├── Sidebar.tsx            # Dark sidebar navigation
│   │   ├── DashboardHome.tsx      # Real-time dashboard with polling
│   │   ├── TelegramTokenModal.tsx # Telegram bot token setup modal
│   │   └── ConnectAccountButtons.tsx # Platform connect buttons with icons
│   └── providers/                 # Context providers
├── lib/
│   ├── late/                      # Late API client + mutations
│   ├── railway/                   # Railway GraphQL client + mutations
│   ├── services/                  # Business logic
│   │   ├── provisioning.ts        # Create/destroy/retry user containers
│   │   ├── subscription.ts        # Stripe checkout + sync
│   │   ├── bot.ts                 # Bot status, token, restart
│   │   └── accounts.ts            # Social account CRUD
│   ├── schemas/                   # Zod validation schemas
│   ├── better-auth/               # Auth config
│   ├── stripe/                    # Stripe client
│   ├── db/                        # Prisma client + schema
│   ├── constants/
│   │   ├── appRouter.ts           # Centralized route config
│   │   ├── errorMessage.ts        # Error message constants
│   │   └── platforms.tsx          # Social platform icons + brand colors
│   ├── errors/                    # Error handler
│   ├── hooks/                     # useApi (React Query)
│   ├── resend/                    # Email client
│   └── emails/                    # React Email templates
├── middleware.ts                   # Auth guard for /d/* routes
└── data/                           # Static data
```

---

## API Routes

| Route | Methods | Auth | Purpose |
|-------|---------|------|---------|
| `/api/auth/[...all]` | All | Various | Better Auth |
| `/api/checkout` | POST | Yes | Create Stripe Checkout session |
| `/api/bot` | GET | Yes | Get bot status |
| `/api/bot` | POST | Yes | Set Telegram token |
| `/api/bot` | PATCH | Yes | Restart bot |
| `/api/accounts` | GET | Yes | List connected accounts |
| `/api/accounts/connect` | POST | Yes | Get Late OAuth URL |
| `/api/accounts/callback` | POST | Yes | Sync accounts after OAuth |
| `/api/dashboard/status` | GET | Yes | Dashboard polling (bot, accounts, subscription) |
| `/api/provisioning/retry` | POST | Yes | Retry failed provisioning |
| `/api/webhooks/stripe` | POST | No | Stripe webhook handler |

---

## Dashboard UI

The dashboard uses a **sidebar layout** with real-time polling:

- **Sidebar** (`Sidebar.tsx`): Dark navy sidebar (`#151929`) with coral accent (`#e8614d`), nav items (Dashboard, Accounts, Billing), user section at bottom. Mobile: sheet drawer.
- **Dashboard home** (`DashboardHome.tsx`): Polls `/api/dashboard/status` every 5s. Shows bot status card (dark gradient), Telegram card, social accounts list with platform icons/colors.
- **Telegram modal** (`TelegramTokenModal.tsx`): Links to OpenClaw docs (`docs.openclaw.ai/channels/telegram`).
- **Connect buttons** (`ConnectAccountButtons.tsx`): Platform icons with brand colors for Twitter/X, LinkedIn, Bluesky, Threads.
- **Content area**: Light gray background (`#f8f9fc`), white rounded cards, `max-w-5xl`.

Supported platforms (text-only): **Twitter/X**, **LinkedIn**, **Bluesky**, **Threads**.

---

## Service Layer

Services live in `src/lib/services/`. Routes call services, services call adapters (`src/lib/late/`, `src/lib/railway/`, `src/lib/stripe/`). Routes never call adapters directly.

### Key flows

**Provisioning (on checkout.session.completed):**
1. Create Late profile → scoped API key
2. Deploy Railway container with env vars
3. Save RailwayService + LateProfile to DB

**Deprovisioning (on subscription.deleted):**
1. Delete Railway service
2. Clean up DB records

**Social account connection:**
1. Get Late OAuth URL → redirect user
2. On callback, sync accounts from Late API → upsert DB → update container env vars

---

## Stripe Webhooks

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Upsert subscription, provision user (non-blocking via `after()`) |
| `customer.subscription.created` | Idempotent upsert subscription |
| `customer.subscription.updated` | Sync status + period dates |
| `customer.subscription.deleted` | Status → canceled, deprovision (non-blocking) |
| `invoice.payment_succeeded` | Extend period, verify container running |
| `invoice.payment_failed` | Status → past_due (do NOT deprovision) |

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

# Railway
RAILWAY_API_TOKEN=
RAILWAY_DEFAULT_PROJECT_ID=

# Late API (master key — not per-user)
LATE_API_KEY=

# LLM (Moonshot/Kimi K2.5)
MOONSHOT_API_KEY=

# Analytics (PostHog)
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=

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

## Phase Status

| Phase | Status | What it covers |
|-------|--------|---------------|
| **Phase 0** | COMPLETE | Railway deploy + OpenClaw + Telegram + Kimi K2.5 |
| **Phase 0.5** | COMPLETE | Late API integration + social posting via Telegram |
| **Phase 1** | COMPLETE | DB schema, Stripe subscription, auto-provisioning, dashboard, onboarding |
| **Phase 2** | TODO | Monitoring, production hardening, self-service billing portal |

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
- **Utilities/Hooks/Services**: camelCase (`provisioning.ts`, `useApi.ts`)
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
const { mutate } = usePost("/api/bot", { onSuccess: () => { ... } });
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

### Late API
- Base URL: `https://getlate.dev/api/v1` (changed from old `api.getlate.dev` domain)
- Client: `src/lib/late/client.ts`
- Profile-scoped API keys for per-user isolation

### Railway
- `setServiceVariables` auto-triggers container redeploy
- Don't set multiple env vars in quick succession — use single call
- Sleep mode enabled on containers to save costs

### OpenClaw Container
- Config dir: `$HOME/.openclaw/` (runs as `node` user)
- Entrypoint generates `openclaw.json` from env vars
- `OVERWRITE_SOUL=true` forces SOUL.md regeneration on restart
- `dmPolicy: "open"` — safe because each user has their own private bot

### Dashboard Layout
- Root layout (`app/layout.tsx`): providers only, no Navbar/Footer
- Public pages in `(home)/` route group: includes Navbar + Footer
- Dashboard in `(dashboard)/` route group: sidebar layout, no Navbar/Footer
- Sidebar uses CSS custom properties (`--sidebar-bg`, etc.) with inline styles

---

## Configuration

App config is centralized in `config.json`:
- Project name, description, tagline, URL
- SEO metadata
- Contact info
- Single pricing plan ($39/mo)
- Feature flags
