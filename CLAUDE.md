# CLAUDE.md

## What is PostClaw?

PostClaw is a SaaS ($39/mo) that gives each user a personal AI content manager on Telegram. Users chat with their bot to create, adapt, and publish social media posts across 4 text-friendly platforms (Twitter/X, LinkedIn, Bluesky, Threads).

**How it works:**
1. User signs up, pays $39/mo via Stripe
2. We auto-provision a private OpenClaw container on Fly.io + a Late API profile
3. User connects their Telegram bot token and social accounts
4. User chats with their bot on Telegram to create and publish content

**Key services:**
- **OpenClaw** — Open-source AI agent framework (runs in Docker on Fly.io)
- **Late API** (getlate.dev) — Unified social media API
- **Kimi K2.5** (Moonshot) — LLM powering the bot
- **Fly.io** — Container hosting (one machine per user)

---

## Architecture

```
User ─── Telegram ─── OpenClaw Container (Fly.io)
                            │
                            ├── Kimi K2.5 (Moonshot API)
                            └── Late API (social posting)

Dashboard (Next.js on Vercel)
    ├── Stripe (payments)
    ├── Fly.io Machines API (container management)
    ├── Late API (account connections)
    └── PostgreSQL (Supabase)
```

**Per-user isolation:** Each user gets their own Fly.io machine with a **profile-scoped Late API key** that can only access their own social accounts. One master Late account, many scoped keys.

**Custom Docker image:** `ghcr.io/adrienbarb/postclaw-agent`
- Tags: `:latest` (production, built from `main`) and `:dev` (testing, built from `dev` branch)
- Entrypoint generates `openclaw.json` + `SOUL.md` from env vars
- Pre-installs the `late-api` skill from ClawHub
- GitHub Action auto-builds on changes to `docker/openclaw/`
- `OPENCLAW_DOCKER_IMAGE` env var overrides image used in provisioning (defaults to `:latest`)

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
     (1:1) ── FlyMachine
     (1:1) ── LateProfile (1:N) ── SocialAccount
     (1:N) ── Media
     (1:N) ── Session
     (1:N) ── Account
```

| Model | Purpose |
|-------|---------|
| **User** | Authenticated user (Better Auth) |
| **Subscription** | Stripe subscription: customerId, subscriptionId, status, period dates |
| **FlyMachine** | User's container: machineId, volumeId, region, status, hasTelegramToken |
| **LateProfile** | User's Late API profile: profileId, scoped API key |
| **SocialAccount** | Connected social platform: accountId, platform, username, status |
| **Media** | Uploaded media: cloudinaryId, url, resourceType, format, bytes, dimensions |
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
│   │       ├── page.tsx           # Chat with provisioning guard (default view)
│   │       ├── accounts/          # Social accounts (connect/disconnect)
│   │       │   └── callback/      # OAuth return handler
│   │       ├── channels/          # Messaging channels (Telegram)
│   │       ├── chat/              # Redirects to /d
│   │       ├── billing/           # Subscription info
│   │       ├── bot/               # Redirects to /d
│   │       └── subscribe/         # Stripe checkout card
│   ├── api/
│   │   ├── auth/[...all]/         # Better Auth
│   │   ├── checkout/              # Stripe Checkout session
│   │   ├── bot/                   # Bot management (GET/POST/PUT/PATCH)
│   │   ├── media/upload/          # Media upload callback (POST)
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
│   │   ├── ChatWithLoader.tsx     # Provisioning guard → ChatInterface
│   │   ├── ChatInterface.tsx      # AI chat with streaming + media upload (Cloudinary)
│   │   ├── DashboardHome.tsx      # Legacy dashboard (kept, unused)
│   │   ├── TelegramTokenModal.tsx # Telegram bot token setup modal
│   │   └── ConnectAccountButtons.tsx # Platform connect buttons with icons
│   └── providers/                 # Context providers
├── lib/
│   ├── late/                      # Late API client + mutations
│   ├── fly/                       # Fly.io Machines API client + mutations
│   ├── services/                  # Business logic
│   │   ├── provisioning.ts        # Create/destroy/retry user containers
│   │   ├── subscription.ts        # Stripe checkout + sync
│   │   ├── bot.ts                 # Bot status, token, restart, image update
│   │   ├── media.ts               # Media upload save + list
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
| `/api/bot` | PUT | Yes | Update bot Docker image |
| `/api/bot` | PATCH | Yes | Restart bot |
| `/api/media/upload` | POST | Yes | Save media upload record |
| `/api/accounts` | GET | Yes | List connected accounts |
| `/api/accounts/connect` | POST | Yes | Get Late OAuth URL |
| `/api/accounts/callback` | POST | Yes | Sync accounts after OAuth |
| `/api/accounts/disconnect` | POST | Yes | Disconnect a social account |
| `/api/chat` | POST | Yes | Streaming chat proxy to OpenClaw container |
| `/api/chat/history` | GET | Yes | Get chat history from container |
| `/api/dashboard/status` | GET | Yes | Dashboard polling (bot, accounts, subscription) |
| `/api/provisioning/retry` | POST | Yes | Retry failed provisioning |
| `/api/webhooks/stripe` | POST | No | Stripe webhook handler |

---

## Dashboard UI

The dashboard is **chat-first** — after subscribing, users land directly on the chat interface.

- **Sidebar** (`Sidebar.tsx`): Dark navy sidebar (`#151929`) with coral accent (`#e8614d`), nav items: Chat, Accounts, Channels, Billing. User section at bottom. Mobile: sheet drawer.
- **Chat** (`/d`): `ChatWithLoader` polls `/api/dashboard/status` every 3s. During provisioning shows spinner + "Your bot is starting up...". On failure shows error + retry button. Once running, renders `ChatInterface` (streaming AI chat via `@ai-sdk/react`).
- **Accounts** (`/d/accounts`): Client component polling dashboard status. Shows connected accounts with disconnect (X) button + `ConnectAccountButtons` to add new ones.
- **Channels** (`/d/channels`): Telegram channel card with connected/not-connected state. Opens `TelegramTokenModal` to set or update token.
- **Telegram modal** (`TelegramTokenModal.tsx`): Links to OpenClaw docs (`docs.openclaw.ai/channels/telegram`).
- **Connect buttons** (`ConnectAccountButtons.tsx`): Platform icons with brand colors for Twitter/X, LinkedIn, Bluesky, Threads.
- **Content area**: Light gray background (`#f8f9fc`), white rounded cards, `max-w-5xl`.

Supported platforms: **Twitter/X**, **LinkedIn**, **Bluesky**, **Threads**. Media uploads (images/videos) supported via Cloudinary.

---

## Service Layer

Services live in `src/lib/services/`. Routes call services, services call adapters (`src/lib/late/`, `src/lib/fly/`, `src/lib/stripe/`). Routes never call adapters directly.

### Key flows

**Provisioning (on checkout.session.completed):**
1. Create Late profile → scoped API key
2. Create Fly.io volume + machine with env vars (single API call for machine)
3. Save FlyMachine + LateProfile to DB

**Deprovisioning (on subscription.deleted):**
1. Delete Fly.io machine + volume
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

# Fly.io
FLY_API_TOKEN=
FLY_APP_NAME=

# Late API (master key — not per-user)
LATE_API_KEY=

# LLM (Moonshot/Kimi K2.5)
MOONSHOT_API_KEY=

# Analytics (PostHog)
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=

# Media (Cloudinary)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Docker image override (optional, defaults to :latest)
OPENCLAW_DOCKER_IMAGE=

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
| **Phase 0** | COMPLETE | Fly.io deploy + OpenClaw + Telegram + Kimi K2.5 |
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

### Fly.io
- One app (`FLY_APP_NAME`) with many machines — one per user
- Machines API (REST): `https://api.machines.dev/v1`
- Client: `src/lib/fly/client.ts`, mutations: `src/lib/fly/mutations.ts`
- `updateMachineEnv` fetches current config, merges env vars, POSTs back — triggers restart
- `restart.policy: "always"` for crash recovery
- Region: `cdg` (Paris), Guest: `shared-cpu-2x, 1024MB RAM`
- `NODE_OPTIONS=--max-old-space-size=768` set on all machines (OpenClaw needs >512MB heap)
- Each machine gets a 1GB volume mounted at `/home/node/.openclaw/`
- No auto-stop (Telegram bots use outbound long-polling, not HTTP)

### Docker Dev/Prod Tags
- GitHub Action builds on push to `main` (→ `:latest` + `:sha`) or `dev` (→ `:dev` + `:sha`)
- `OPENCLAW_DOCKER_IMAGE` env var overrides image in provisioning (defaults to `:latest`)
- Fly machines are pinned to a specific image digest — restarting does NOT auto-pull new tags
- To update existing machines: use `PUT /api/bot` with `{ image: "ghcr.io/adrienbarb/postclaw-agent:dev" }`
- To promote: merge `dev` → `main`, push, then update all prod machines with `updateMachineImage()`

### Media Upload (Cloudinary)
- `next-cloudinary` package with `CldUploadWidget` in ChatInterface
- Unsigned upload preset: `postclaw_unsigned`, cloud: `postclaw`
- Media saved to `Media` table via `/api/media/upload` (fire-and-forget from client)
- Chat messages include `[MEDIA: <url>]` + `[MEDIA_TYPE: <mime>]` tags
- SOUL.md teaches bot to handle media via Late API skill (`xurl media upload` + `xurl post --media-id`)

### OpenClaw Container
- Config dir: `$HOME/.openclaw/` (runs as `node` user)
- Entrypoint generates `openclaw.json` from env vars
- `OVERWRITE_SOUL=true` forces SOUL.md regeneration on restart
- `dmPolicy: "open"` — safe because each user has their own private bot

### PostHog A/B Testing
- Server-side experiments via `posthog-node` feature flags
- `src/proxy.ts` sets a `postclaw_distinct_id` cookie (UUID, 1-year TTL) on first visit — Next.js 16 uses `proxy.ts` instead of `middleware.ts`
- Distinct ID helpers in `src/lib/tracking/distinctId.ts`: `getDistinctId()` (server components), `getDistinctIdFromHeader()` (raw cookie header)
- PostHog server client singleton in `src/lib/tracking/postHogClient.ts`
- Home page (`src/app/(home)/page.tsx`) evaluates feature flags server-side via `getFeatureFlag()`, passes variant as prop
- `user_signed_up` event captured in Better Auth `databaseHooks.user.create.after` — linked to anonymous distinct ID for conversion tracking
- Experiments must be created in PostHog dashboard (feature flag key + goal metric)
- Active experiment: `hero-copy-experiment` (control vs test hero copy)

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
