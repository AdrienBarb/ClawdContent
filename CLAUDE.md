# CLAUDE.md

## What is PostClaw?

PostClaw is an AI social media manager. It learns your brand, plans content, and publishes to social accounts. No dashboard, no editor, no learning curve.

**ICP (three segments — homepage "Who it's for" section names all three):**

- **Small business owners** — photographers, caterers, coaches, consultants, local shops too busy serving customers
- **Solo founders / indie hackers** — shipping product, can't justify in-house social
- **Creators** — would rather make than post

**Positioning:** A _manager_, not a tool. Core value prop: "Tell me what to post and post it for me." PostClaw publishes to **Instagram and Facebook only** — all other networks were removed on 2026-06-08. Headline: "Grow your Facebook & Instagram on autopilot."

**Voice:** Match the audience. For SMB-facing copy: plain language, concrete examples — "Would a photographer or a caterer in Leeds understand this?" still applies. For founder/creator-facing copy: heavier startup jargon is fine. Avoid voice that talks past whichever segment you're addressing.

**Pricing:** One plan — `pro` at $99/mo, monthly only (yearly billing + free trial removed 2026-06-10). Hard paywall: no free posts, no free generations — onboarding ends at the paywall and `/d` requires a subscription to do anything. Legacy `starter`/`business` IDs still resolve to `pro`; old $49 subscribers keep their grandfathered Stripe price (billing page shows the live Stripe amount, not the constant).

## How it works

1. Sign up → `LateProfile` (Zernio) auto-created via Better Auth `user.create.after`
2. Onboarding: website URL (Firecrawl scrape) or business description → AI-extracted `knowledgeBase` → user validates
3. Connect social accounts (free)
4. First connect → Inngest `analyze-account` (insights only — suggestions are NOT generated here)
5. `/d` shows the chat composer + drafts board. User chats ("draft 5 posts about my Easter menu") → `generate_posts` tool → drafts appear on the board
6. User reviews, edits, schedules, publishes
7. Stripe subscription ($99/mo) — required at the end of onboarding (hard paywall, no trial) before reaching `/d`

## Architecture

```
Next.js 16 (App Router, RSC) on Vercel
  ├── Better Auth (magic link + Google OAuth)
  ├── Stripe (single $99 plan + webhook)
  ├── Zernio API (account connect + compose + analytics — Instagram + Facebook)
  ├── Inngest (account/connected, account/refresh-insights)
  ├── Anthropic Sonnet 4.6 — insights, suggestions, rewrites, onboarding extraction
  ├── PostgreSQL (Supabase) via Prisma 7 + adapter-pg
  └── Sanity (blog + alternatives content)
```

**Per-user isolation:** Each user gets a profile-scoped Zernio API key. One master Zernio account, many scoped keys (created in `ensureUserProfile`).

**Chat surface scoped to drafts.** `/d` has a chat composer (`ChatPanel` → `/api/chat` via `streamText`). The model has exactly five tools — `generate_posts`, `update_post`, `regenerate_post`, `delete_draft`, `set_schedule` — all wrapping `PostSuggestion` CRUD. `set_schedule` only _stages_ a time on the draft; **publishing and committing schedules still require the user to click Post / Schedule on the `PostCard` or `BulkBar`** in `SuggestionsBoard`. Chat is ephemeral (no `chat_message` persistence). Insights/onboarding extraction still use `generateObject`.

**Supported platforms (2):** Instagram and Facebook only. Single source of truth: `SUPPORTED_PLATFORMS` / `isSupportedPlatform` in `src/lib/insights/platformConfig.ts` (+ UI list in `src/lib/constants/platforms.tsx`). All 7 other networks were removed 2026-06-08. Legacy accounts on removed platforms are **hidden** at every read boundary (`getConnectedAccounts`, analytics, suggestions route, `computeInsights`) via `isSupportedPlatform` — never deleted.

## Where things live

```
src/app/(home)/           Public pages (Navbar + Footer)
src/app/(dashboard)/      Auth-guarded shell + /d routes
src/app/(onboarding)/     Two-step onboarding (knowledgeBase === null gate)
src/app/api/              Route handlers — thin: validate → service → return
src/components/ui/        shadcn primitives
src/components/sections/  Landing sections
src/components/dashboard/ Dashboard app components
src/lib/services/         Business logic — routes call services
src/lib/late/             Zernio API client (directory + DB model named "Late" for legacy)
src/lib/ai/               Anthropic provider + rewrite prompt builder
src/lib/db/               schema.prisma + adapter-pg client
src/lib/schemas/          Zod schemas (parse at route boundary)
src/lib/constants/        appRouter, errorMessage, plans, platforms
src/inngest/functions/    Background workflows
src/proxy.ts              Next 16 proxy: distinct-id + UTM cookies (NO auth)
```

Path-scoped `CLAUDE.md` files (load automatically when working in their subtree):

- `src/components/dashboard/CLAUDE.md` — design system tokens + component patterns
- `src/lib/services/CLAUDE.md` — insights schema + suggestion pipeline
- `src/app/api/CLAUDE.md` — route handler pattern
- `src/lib/stripe/CLAUDE.md` — SDK v20 quirks + webhook events

## Data model

```
User (1:1) Subscription
     (1:1) LateProfile (1:N) SocialAccount (1:N) PostSuggestion
     (1:N) Media, Session, Account
```

Schema at `src/lib/db/schema.prisma`. **No enums** — status fields are plain strings with comments. `User.knowledgeBase` is `Json?`; `null` triggers `/onboarding` redirect in `(dashboard)/layout.tsx`.

## Critical gotchas

These bite — keep them in mind everywhere:

- **Anthropic `generateObject` rejects `minItems` / `maxItems`** on Zod arrays. Trim/validate in code, not the schema sent to Claude. Pattern: split into Claude-safe schema + internal-validation schema (see `src/lib/schemas/insights.ts`).
- **Inngest CLI scripts must pass `eventKey` + `isDev: false`** explicitly — the env var alone silently drops events. Use `new Inngest({ id, eventKey: process.env.INNGEST_EVENT_KEY, isDev: false })`.
- **Zernio is "Late" in code** — directory `src/lib/late/`, DB model `LateProfile`, fields `lateProfileId` / `lateApiKey` / `lateAccountId`. Master key falls back: `ZERNIO_API_KEY ?? LATE_API_KEY`.
- **Prisma 7 uses adapter-pg only** — no `url` in schema, no `datasourceUrl` in constructor. CLI uses `DIRECT_URL`, runtime uses `DATABASE_URL`. SSL `rejectUnauthorized: false` in prod.
- **Stripe SDK v20 (`2026-01-28.clover`)** — period dates live on subscription **items** (`sub.items.data[0].current_period_start`). Invoice→subscription via `invoice.parent?.subscription_details?.subscription`. Webhooks deduped via `StripeEvent.id` insert.
- **Zernio `day_of_week` is 0=Monday** (matches `platformConfig.defaultBestTimes`). Media types are `image` / `video` / `gif` / `document` (not MIME). Immediate posts need `publishNow: true`.
- **The proxy enforces NO auth.** Auth lives in route handlers + `(dashboard)/layout.tsx`. `src/proxy.ts` only sets `postclaw_distinct_id` (1y) + `postclaw_utm` first-touch (30d).
- **Post generation runs on user-visible actions only** — the chat tool `generate_posts` calls `createFromBrief` synchronously inside `/api/chat`. Never in Inngest. Suggestion IDs are stable across runs — `generate_posts` appends a new batch onto the targeted accounts' existing drafts rather than replacing them.

## Coding standards

1. **Type safety** — TypeScript everywhere. Avoid `any`.
2. **Server Components default** — Client only for interactivity.
3. **Thin routes** — validate input → call service → return. No business logic in routes.
4. **Service layer** — all business logic in `src/lib/services/`. Services call adapters (`lib/late/`, `lib/stripe/`, `lib/brevo/`, `lib/firecrawl/`, `lib/cloudinary/`).
5. **No barrel imports** — import directly from source, never through `index.ts`.

**Naming:** Components PascalCase (`PublishPage.tsx`). Utils / hooks / services camelCase (`profile.ts`, `useApi.ts`). Constants UPPER_SNAKE_CASE inside files.

**Client data fetching:** Use `useApi` (`src/lib/hooks/useApi.ts`) — wraps React Query with the axios instance and global error store. `useDashboardStatus` is a pre-built hook for the polling status endpoint.

**Styling:** Tailwind v4 + shadcn/ui from `@/components/ui/`. Coral (`#ec6f5b`) is the only accent and never destructive. Full design system in `src/components/dashboard/CLAUDE.md`.

## Commands

```bash
npm run dev                # dev server
npm run vercel-build       # prisma generate + (prod) migrate deploy + next build
npm run db:migrate         # prisma migrate dev
npm run db:studio          # Prisma Studio
npm run email:dev          # React Email preview
npm run backfill:insights  # tsx scripts/backfill-insights.ts (--apply)
```

One-off scripts under `scripts/` (require dotenv): `check-accounts.ts`, `insights-stats.ts`, `inspect-user.ts`.

Environment variables documented in `docs/environment.md`.

## External communication

- **Never mention Anthropic, Claude, OpenAI, or any AI provider** in user-facing content. Use "proprietary AI engine" or "our AI." Internal code/docs can use real names.
- **Never use "AI" in product UX copy** — describe what it does ("plans your posts," "writes captions"), not the technology behind it.
- **Never highlight or reorder platforms** in the connect UI — we don't know which platforms users actually post on.
