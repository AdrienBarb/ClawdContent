# CLAUDE.md

## What is PostClaw?

PostClaw is an AI social media manager for **Instagram**. It learns your brand, builds a growth strategy, and then **plans, generates, and publishes your posts automatically on full autopilot** — the user just steers (a brief, a veto, an edit). Manual one-off post generation still exists (the "Create" tab) but is a **secondary** feature, not the core loop. No content calendar to fill, no editor, no learning curve.

**ICP (three segments — homepage "Who it's for" section names all three):**

- **Small business owners** — photographers, caterers, coaches, consultants, local shops too busy serving customers
- **Solo founders / indie hackers** — shipping product, can't justify in-house social
- **Creators** — would rather make than post

**Positioning:** A _manager_, not a tool — a true social media manager that builds the strategy and posts for you automatically, not a generator you operate by hand. Core value prop: "Tell me about your business and I'll run your Instagram." PostClaw publishes to **Instagram only** — the 9→2 platform cut landed 2026-06-08, then Facebook was removed 2026-06-19 (2→1). Headline: "Grow your Instagram on autopilot."

**Voice:** Match the audience. For SMB-facing copy: plain language, concrete examples — "Would a photographer or a caterer in Leeds understand this?" still applies. For founder/creator-facing copy: heavier startup jargon is fine. Avoid voice that talks past whichever segment you're addressing.

**Pricing:** One plan — `pro` at $99/mo, monthly only (yearly billing + free trial removed 2026-06-10). Hard paywall: no free posts, no free generations — onboarding ends at the paywall and `/d` requires a subscription to do anything. Legacy `starter`/`business` IDs still resolve to `pro`; old $49 subscribers keep their grandfathered Stripe price (billing page shows the live Stripe amount, not the constant).

## How it works

1. Sign up (magic link / Google) → Better Auth `user.create.after` only tracks the signup + creates a Resend marketing contact. **The Zernio `LateProfile` is NOT created here** — it's provisioned lazily at checkout via `ensureUserProfile` (step 6).
2. Onboarding: website URL (Firecrawl scrape) or business description → AI-extracted `knowledgeBase` → user validates → branding (logo + optional brand photos)
3. Connect Instagram (free)
4. First connect → Inngest `analyze-account` (insights + strategy — suggestions are NOT generated here)
5. Stripe subscription ($99/mo) — required at the end of onboarding (hard paywall, no trial; paywall reveals the strategy) before reaching `/d`
6. **Checkout completed** (`checkout.session.completed` webhook) → sets `onboardingCompletedAt`, creates the Zernio profile (`ensureUserProfile`), and **fires the first rolling week immediately** (`autopilot/generate-week`, reason `first_week`, anchored on the checkout day) — user lands on `/d` to "Preparing your week…" that resolves into a full scheduled 7-day window
7. **Rolling weekly loop**: each user has a personal 7-day window anchored on their first-generation day; it advances 7 days each cycle. `autopilot-dispatch` (hourly cron) generates the next window the **evening before it starts** (`reason: "recurring"`) → refresh insights/strategy → plan window (strategy + knowledgeBase + best times + outcomes + optional `pendingBrief`) → generate ALL media via Google Gemini → commit schedules to Zernio → digest email with one-click Edit / Regenerate / Veto links. Existing Monday-anchored users keep getting their week the same Sunday evening (no migration needed).
8. `/d` (`WeekPage`, tab "My week") = week timeline (native Instagram preview cards grouped by day) + `AutopilotHeader` (mode dropdown full_auto/review/paused) + brief bar ("What's coming up this week?"). The separate **"Create" tab** (`/explore`) is the manual single-post generator. User can veto/edit anything; default mode `full_auto` commits without asking, `review` mode stages the week until "Launch my week"

## Architecture

```
Next.js 16 (App Router, RSC) on Vercel
  ├── Better Auth (magic link + Google OAuth)
  ├── Stripe (single $99 plan + webhook → first-week trigger)
  ├── Zernio API (account connect + compose + analytics — Instagram only)
  ├── Inngest v4 (autopilot-dispatch cron + autopilot-generate-week, account/connected, account/refresh-insights, compute-outcomes)
  ├── Anthropic Sonnet 4.6 — insights, strategy, week planning, rewrites, OCR guard, onboarding extraction
  ├── Google Gemini (@google/genai) — ALL generated media: gemini-3-pro-image (text cards/carousels), gemini-3.1-flash-image (photoreal), veo-3.1-fast-generate-preview (Reels)
  ├── Resend (single email provider: magic links, weekly digest, alerts) + React Email
  ├── PostgreSQL (Supabase) via Prisma 7 + adapter-pg · Supabase Storage `media` bucket
  └── Sanity (blog + alternatives content)
```

**Per-user isolation:** Each user gets a profile-scoped Zernio API key. One master Zernio account, many scoped keys (created in `ensureUserProfile`).

**Autopilot is the heartbeat.** `autopilot-dispatch` (Inngest cron `0 * * * *`) computes each eligible user's next **rolling 7-day window** via `computeDueAnchor` (`src/lib/services/autopilot/schedule.ts`): advance the anchor +7 days from their last window, retry a failed one, or bootstrap if none exists. It fires `autopilot/generate-week` (`reason: "recurring"`) the **evening before** the window starts (`generationFireAt` = anchor−1day @ 17:00 local — generalizes the old "Sunday 17:00 → Monday week"). Event-id deduped per user+anchor+date+hour; failed batches re-dispatch on later ticks, max 3 attempts. `autopilot-generate-week` (concurrency 1/user, 6 global) claims the `WeeklyBatch` (unique `[userId, weekStart]`, where `weekStart` = the rolling anchor), refreshes insights + regenerates a missing strategy, builds the frozen `styleKit`, plans each account's window (`planAccountWeek` → `planSlotDates` clamps every post to `[anchor, anchor+7d)`), renders media per post in its own step, commits via `publishOrScheduleSuggestion(action: "schedule")` in full_auto (review mode stages locally), writes a durable post snapshot onto `WeeklyBatch.posts`, then sends the digest immediately (Resend, idempotent per batch). **Inngest step outputs must stay small — media steps upload to Supabase inside the step and return URLs only (4MB step cap).**

**Manual generation: the "Create" tab (`/explore`).** `/explore` (`ExploreScreen` → `/api/explore/{generate,regenerate-image,commit}` → `composePost`) is the secondary, manual single-post generator: pick one account → brief → generate caption + media (`claude-sonnet-4-6`, 4:5 aspect) **ephemerally in client state, no DB row** → post now or schedule. Committing lazily creates a `PostSuggestion` via `commitComposedPost` → shared `publishOrScheduleSuggestion`, then deletes the row. No cooldown. Insights/onboarding extraction still use `generateObject`.

**Legacy/orphaned chat surface.** The old 7-tool chat composer (`ChatPanel` → `/api/chat` via `streamText`, rendered in `PublishPage`) is **no longer routed anywhere** — `PublishPage` is dead code, kept only until it's deleted. Don't build on it. Tools were `generate_posts`, `update_post`, `regenerate_post`, `delete_draft`, `set_schedule`, `publish_drafts`, `schedule_drafts`.

**Media pipeline (`src/lib/media/`) — single provider Google Gemini.** `gemini-3-pro-image` for text cards/carousel slides (exact on-image copy), `gemini-3.1-flash-image` for photoreal (never on-image text), `veo-3.1-fast-generate-preview` for 9:16 Reels (image-to-video from a Nano Banana hero frame; async start→poll→download across Inngest steps; preview id — plan GA migration). Every text-bearing render passes the **OCR guard** (Claude-vision transcription + token diff, numeric tokens strict) with one regen. Carousels re-anchor every slide to the cover (anti-drift). All assets are cover-resized with sharp to exact 1080×1350 / 1080×1920 and persisted to the Supabase `media` bucket + a `Media` row. Degradation: reel→hero still→`needs_media`; image×2 fail→`needs_media` (IG posts never commit without media).

**One-click digest actions.** `/api/autopilot/actions` is token-authorized (HMAC, `AUTOPILOT_ACTION_SECRET`), not session-gated. GET renders a confirm page; POST executes — email scanners prefetch GETs, so side effects only on POST. Veto deletes the Zernio post / local row; Regenerate rewrites the caption; review mode's "Launch my week" commits the staged batch.

**Supported platform (1):** Instagram only. Single source of truth: `SUPPORTED_PLATFORMS` / `isSupportedPlatform` in `src/lib/insights/platformConfig.ts` (`PLATFORM_CONFIG` has only `instagram`) + UI list in `src/lib/constants/platforms.tsx`. The 7 other networks were removed 2026-06-08 (9→2), then Facebook on 2026-06-19 (2→1). Legacy accounts on removed platforms — **including Facebook** — are **hidden** at every read boundary (`getConnectedAccounts`, analytics, suggestions route, `computeInsights`) via `isSupportedPlatform` — never deleted.

## Where things live

```
src/app/(home)/           Public pages (Navbar + Footer)
src/app/(dashboard)/      Auth-guarded shell (DashboardTabs) + /d (week timeline) + /explore (manual "Create" generator)
src/app/(onboarding)/     Six-screen onboarding (onboardingCompletedAt gate)
src/app/api/              Route handlers — thin: validate → service → return
src/components/ui/        shadcn primitives
src/components/sections/  Landing sections
src/components/dashboard/ Dashboard app components (week/ timeline, explore/ Create tab, previews/ native IG card)
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

Autopilot fields: `User.autopilotMode` ("full_auto" default | "review"), `User.autopilotPausedAt`, `User.pendingBrief` (consumed by the next batch), `User.styleKit Json` (frozen brand kit). `WeeklyBatch` is one row per user per rolling week (`@@unique([userId, weekStart])` = dispatch idempotency anchor, where `weekStart` is the user's rolling anchor — their first-generation day, +7d each cycle — not a calendar Monday); `WeeklyBatch.posts Json` is the durable snapshot the digest/dashboard/webhook-retry read — local `PostSuggestion` rows are **deleted** on Zernio commit (existing pattern), so the snapshot is the only record of a committed week. `PostSuggestion.batchId/status/mediaPlan` tie drafts to batches ("needs_media" = held back from commit; mediaPlan enables regenerate).

## Critical gotchas

These bite — keep them in mind everywhere:

- **Anthropic `generateObject` rejects `minItems` / `maxItems`** on Zod arrays. Trim/validate in code, not the schema sent to Claude. Pattern: split into Claude-safe schema + internal-validation schema (see `src/lib/schemas/insights.ts`).
- **Inngest CLI scripts must pass `eventKey` + `isDev: false`** explicitly — the env var alone silently drops events. Use `new Inngest({ id, eventKey: process.env.INNGEST_EVENT_KEY, isDev: false })`.
- **Zernio is "Late" in code** — directory `src/lib/late/`, DB model `LateProfile`, fields `lateProfileId` / `lateApiKey` / `lateAccountId`. Master key falls back: `ZERNIO_API_KEY ?? LATE_API_KEY`.
- **Prisma 7 uses adapter-pg only** — no `url` in schema, no `datasourceUrl` in constructor. CLI uses `DIRECT_URL`, runtime uses `DATABASE_URL`. SSL `rejectUnauthorized: false` in prod.
- **Stripe SDK v20 (`2026-01-28.clover`)** — period dates live on subscription **items** (`sub.items.data[0].current_period_start`). Invoice→subscription via `invoice.parent?.subscription_details?.subscription`. Webhooks deduped via `StripeEvent.id` insert.
- **Zernio `day_of_week` is 0=Monday** (matches `platformConfig.defaultBestTimes`). Media types are `image` / `video` / `gif` / `document` (not MIME). Immediate posts need `publishNow: true`.
- **The proxy enforces NO auth.** Auth lives in route handlers + `(dashboard)/layout.tsx`. `src/proxy.ts` only sets `postclaw_distinct_id` (1y) + `postclaw_utm` first-touch (30d).
- **Two live generation paths, don't mix them.** The **autopilot** (`planAccountWeek` inside Inngest — the core loop, writes `batchId`/`scheduledAt`/`mediaPlan`) and the **"Create" tab** (`/explore` → `composePost`, manual single post, ephemeral until `commitComposedPost`). Both ultimately commit through `publishOrScheduleSuggestion`; neither replaces existing drafts. (The old `/api/chat` 7-tool surface in `PublishPage` is **dead code** — not routed, don't build on it.)
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
