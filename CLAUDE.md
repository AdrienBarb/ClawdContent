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
2. Onboarding: website URL (Firecrawl scrape) or business description → AI-extracted `knowledgeBase` → user validates → branding (logo + optional brand photos)
3. Connect social accounts (free)
4. First connect → Inngest `analyze-account` (insights + strategy — suggestions are NOT generated here)
5. Stripe subscription ($99/mo) — required at the end of onboarding (hard paywall, no trial; paywall reveals the strategy) before reaching `/d`
6. **Checkout completed → first autopilot week generates immediately** (`autopilot/generate-week`, reason `first_week`) — user lands on `/d` to "Preparing your week…" that resolves into a full scheduled week
7. **Weekly loop**: every Sunday 17:00 user-local, `autopilot-dispatch` (hourly cron) fans out `autopilot/generate-week` per eligible user → refresh insights/strategy → plan week (strategy + knowledgeBase + best times + outcomes + optional `pendingBrief`) → generate ALL media via Google Gemini → commit schedules to Zernio → digest email ~18:00 local with one-click Edit / Regenerate / Veto links
8. `/d` = week timeline (native IG/FB preview cards grouped by day) + brief bar ("What's coming up this week?") + expandable chat composer. User can veto/edit anything; default mode `full_auto` commits without asking, `review` mode stages the week until "Launch my week"

## Architecture

```
Next.js 16 (App Router, RSC) on Vercel
  ├── Better Auth (magic link + Google OAuth)
  ├── Stripe (single $99 plan + webhook → first-week trigger)
  ├── Zernio API (account connect + compose + analytics — Instagram + Facebook)
  ├── Inngest v4 (autopilot-dispatch cron + autopilot-generate-week, account/connected, account/refresh-insights, compute-outcomes)
  ├── Anthropic Sonnet 4.6 — insights, strategy, week planning, rewrites, OCR guard, onboarding extraction
  ├── Google Gemini (@google/genai) — ALL generated media: gemini-3-pro-image (text cards/carousels), gemini-3.1-flash-image (photoreal), veo-3.1-fast-generate-preview (Reels)
  ├── Resend (single email provider: magic links, weekly digest, alerts) + React Email
  ├── PostgreSQL (Supabase) via Prisma 7 + adapter-pg · Supabase Storage `media` bucket
  └── Sanity (blog + alternatives content)
```

**Per-user isolation:** Each user gets a profile-scoped Zernio API key. One master Zernio account, many scoped keys (created in `ensureUserProfile`).

**Autopilot is the heartbeat.** `autopilot-dispatch` (Inngest cron `0 * * * *`) finds users whose local time is Sunday 17:00 and fans out one `autopilot/generate-week` event per user (event-id deduped per user+week+attempt; failed batches re-dispatch later the same Sunday, max 3 attempts). `autopilot-generate-week` (concurrency 1/user, 6 global) claims the `WeeklyBatch` (unique `[userId, weekStart]`), refreshes insights + regenerates a missing strategy, builds the frozen `styleKit`, plans each account's week (`planAccountWeek`), renders media per post in its own step, commits via `publishOrScheduleSuggestion(action: "schedule")` in full_auto (review mode stages locally), writes a durable post snapshot onto `WeeklyBatch.posts`, then sends the digest (Resend, idempotent per batch). **Inngest step outputs must stay small — media steps upload to Supabase inside the step and return URLs only (4MB step cap).**

**Chat surface scoped to drafts.** `/d` has an expandable chat composer (`ChatPanel` → `/api/chat` via `streamText`). The model has exactly **seven** tools — `generate_posts`, `update_post`, `regenerate_post`, `delete_draft`, `set_schedule`, `publish_drafts`, `schedule_drafts` — wrapping `PostSuggestion` CRUD + the publish pipeline. `set_schedule` only _stages_ a time; `publish_drafts`/`schedule_drafts` commit (with an explicit-confirmation protocol in the system prompt). Chat is ephemeral (no `chat_message` persistence). Insights/onboarding extraction still use `generateObject`.

**Media pipeline (`src/lib/media/`) — single provider Google Gemini.** `gemini-3-pro-image` for text cards/carousel slides (exact on-image copy), `gemini-3.1-flash-image` for photoreal (never on-image text), `veo-3.1-fast-generate-preview` for 9:16 Reels (image-to-video from a Nano Banana hero frame; async start→poll→download across Inngest steps; preview id — plan GA migration). Every text-bearing render passes the **OCR guard** (Claude-vision transcription + token diff, numeric tokens strict) with one regen. Carousels re-anchor every slide to the cover (anti-drift). All assets are cover-resized with sharp to exact 1080×1350 / 1080×1920 and persisted to the Supabase `media` bucket + a `Media` row. Degradation: reel→hero still→`needs_media`; image×2 fail→`needs_media` (IG posts never commit without media).

**One-click digest actions.** `/api/autopilot/actions` is token-authorized (HMAC, `AUTOPILOT_ACTION_SECRET`), not session-gated. GET renders a confirm page; POST executes — email scanners prefetch GETs, so side effects only on POST. Veto deletes the Zernio post / local row; Regenerate rewrites the caption; review mode's "Launch my week" commits the staged batch.

**Supported platforms (2):** Instagram and Facebook only. Single source of truth: `SUPPORTED_PLATFORMS` / `isSupportedPlatform` in `src/lib/insights/platformConfig.ts` (+ UI list in `src/lib/constants/platforms.tsx`). All 7 other networks were removed 2026-06-08. Legacy accounts on removed platforms are **hidden** at every read boundary (`getConnectedAccounts`, analytics, suggestions route, `computeInsights`) via `isSupportedPlatform` — never deleted.

## Where things live

```
src/app/(home)/           Public pages (Navbar + Footer)
src/app/(dashboard)/      Auth-guarded shell (top Navbar) + /d routes (week timeline, results, channels…)
src/app/(onboarding)/     Six-screen onboarding (onboardingCompletedAt gate)
src/app/api/              Route handlers — thin: validate → service → return
src/components/ui/        shadcn primitives
src/components/sections/  Landing sections
src/components/dashboard/ Dashboard app components (week/ timeline, previews/ native cards)
src/lib/services/         Business logic — routes call services (autopilot/ = weekly loop services)
src/lib/media/            Gemini media pipeline (images, Veo Reels, OCR guard, styleKit, resize)
src/lib/late/             Zernio API client (directory + DB model named "Late" for legacy)
src/lib/ai/               Anthropic provider + chat tools + rewrite prompt builder
src/lib/emails/           React Email templates (digest, alerts, magic link)
src/lib/db/               schema.prisma + adapter-pg client
src/lib/schemas/          Zod schemas (parse at route boundary)
src/lib/constants/        appRouter, errorMessage, plans, platforms
src/inngest/functions/    Background workflows (autopilot.ts = dispatch + generate-week)
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
     (1:1) LateProfile (1:N) SocialAccount (1:N) PostSuggestion (N:1) WeeklyBatch
     (1:N) WeeklyBatch, Media, Session, Account
```

Schema at `src/lib/db/schema.prisma`. **No enums** — status fields are plain strings with comments. `User.onboardingCompletedAt === null` triggers the `/onboarding` redirect in `(dashboard)/layout.tsx`.

Autopilot fields: `User.autopilotMode` ("full_auto" default | "review"), `User.autopilotPausedAt`, `User.pendingBrief` (consumed by the next batch), `User.styleKit Json` (frozen brand kit). `WeeklyBatch` is one row per user per week (`@@unique([userId, weekStart])` = dispatch idempotency anchor); `WeeklyBatch.posts Json` is the durable snapshot the digest/dashboard/webhook-retry read — local `PostSuggestion` rows are **deleted** on Zernio commit (existing pattern), so the snapshot is the only record of a committed week. `PostSuggestion.batchId/status/mediaPlan` tie drafts to batches ("needs_media" = held back from commit; mediaPlan enables regenerate).

## Critical gotchas

These bite — keep them in mind everywhere:

- **Anthropic `generateObject` rejects `minItems` / `maxItems`** on Zod arrays. Trim/validate in code, not the schema sent to Claude. Pattern: split into Claude-safe schema + internal-validation schema (see `src/lib/schemas/insights.ts`).
- **Inngest CLI scripts must pass `eventKey` + `isDev: false`** explicitly — the env var alone silently drops events. Use `new Inngest({ id, eventKey: process.env.INNGEST_EVENT_KEY, isDev: false })`.
- **Zernio is "Late" in code** — directory `src/lib/late/`, DB model `LateProfile`, fields `lateProfileId` / `lateApiKey` / `lateAccountId`. Master key falls back: `ZERNIO_API_KEY ?? LATE_API_KEY`.
- **Prisma 7 uses adapter-pg only** — no `url` in schema, no `datasourceUrl` in constructor. CLI uses `DIRECT_URL`, runtime uses `DATABASE_URL`. SSL `rejectUnauthorized: false` in prod.
- **Stripe SDK v20 (`2026-01-28.clover`)** — period dates live on subscription **items** (`sub.items.data[0].current_period_start`). Invoice→subscription via `invoice.parent?.subscription_details?.subscription`. Webhooks deduped via `StripeEvent.id` insert.
- **Zernio `day_of_week` is 0=Monday** (matches `platformConfig.defaultBestTimes`). Media types are `image` / `video` / `gif` / `document` (not MIME). Immediate posts need `publishNow: true`.
- **The proxy enforces NO auth.** Auth lives in route handlers + `(dashboard)/layout.tsx`. `src/proxy.ts` only sets `postclaw_distinct_id` (1y) + `postclaw_utm` first-touch (30d).
- **Two generation paths, don't mix them.** Chat (`generate_posts` → `createFromBrief`, synchronous in `/api/chat`, 30s cooldown) and the autopilot (`planAccountWeek` inside Inngest, no cooldown, writes `batchId`/`scheduledAt`/`mediaPlan`). Both append `PostSuggestion` rows; neither replaces existing drafts.
- **Gemini model ids are GA, Veo is preview.** `gemini-3-pro-image` / `gemini-3.1-flash-image` (the `-preview` image ids shut down 2026-06-25 — never reintroduce them); `veo-3.1-fast-generate-preview` is pinned in `src/lib/media/gemini.ts` and needs a GA migration. Gemini returns inline base64 / 2-day URIs → persist to Supabase immediately; **never return raw bytes from an Inngest step** (4MB cap).
- **Digest action links: side effects only on POST.** Email scanners prefetch GET links; `/api/autopilot/actions` GET must stay render-only.

## Coding standards

1. **Type safety** — TypeScript everywhere. Avoid `any`.
2. **Server Components default** — Client only for interactivity.
3. **Thin routes** — validate input → call service → return. No business logic in routes.
4. **Service layer** — all business logic in `src/lib/services/`. Services call adapters (`lib/late/`, `lib/stripe/`, `lib/resend/`, `lib/media/`, `lib/firecrawl/`, `lib/supabase/`).
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
