# PostClaw — Social Media Manager Rewrite

> Self-contained implementation prompt. Drop into a fresh Claude session, or run via `/apex` with phases as tasks. Don't deviate from locked decisions; ask the user when you hit an unlocked product choice.

## Mission

Pivot PostClaw from a chat-driven post drafter into a true autonomous social media manager. The end state:

> Users sign up → connect their social accounts → the app analyzes their brand + each account → defines a per-platform strategy → autopublishes brand-styled content on a weekly cron. No chat. No usage ledger. No v1/v2 split. One $49/mo plan. 3-day Stripe trial with CC up front.

If a feature doesn't move the app toward "behaves like a human social media manager would," cut it.

---

## Operating rules for the executing agent

1. **Follow `CLAUDE.md` religiously** — voice rules, no-AI-in-product-copy, never-highlight-platforms in the connect picker, thin routes, services-call-adapters.
2. **Each phase = at least one commit.** Use the `/commit` skill or write commit messages in the style of recent commits (`feat:`, `fix:`, `refactor:` lowercase, present tense).
3. **After every code change**: run typecheck + lint. After UI changes: load the page in a browser and click through the flow.
4. **All UI work** invokes `/ui-ux-pro-max` then `/frontend-design` before implementing. Don't draft layouts blind.
5. **End-to-end verification** uses the `verifier` agent — give it a clear flow to walk through.
6. **When stuck on a product decision**, ask the user. Don't guess on UX or pricing.
7. **Never test on real users' connected accounts.** Read-only when debugging real data.
8. **Voice for product copy**: plain, no "AI". Voice for marketing copy: per `~/.claude/postclaw/knowledge/positioning.md` (three ICP segments).

---

## Locked decisions (do not re-litigate)

| # | Decision | Value |
|---|---|---|
| D1 | v1/v2 split | **Deleted.** Full migration. Every user goes through new flow. Existing Stripe subs survive. |
| D2 | Chat interface | **Deleted.** Drafts edited via dashboard UI only. |
| D3 | Usage ledger / wallet | **Deleted.** No metered usage, no topups, no usage modal. |
| D4 | Pricing | Single plan `pro` at $49/mo. 3-day Stripe trial with `trial_period_days: 3` + card up front. **Checkout placed at the end of onboarding** (after step 4 connect, before landing on `/d`) — sunk-cost from completing onboarding lifts conversion vs. card-first. |
| D5 | Onboarding step 1 | Website URL (Firecrawl scrape) OR business description. Existing logic — keep. |
| D6 | Onboarding step 2 | Validate extracted `knowledgeBase`. Existing logic — keep. |
| D7 | Onboarding step 3 (NEW) | Brand identity. Auto-derived from website scrape (colors + logo + photos). If website didn't give us enough, ask user to upload logo + pick 2-3 brand colors. |
| D8 | Onboarding step 4 (NEW) | Mandatory social connect. All 9 platforms displayed (no highlighting / reordering). Must connect at least 1 to enter the app. |
| D9 | Generation cadence | Weekly Inngest cron, Sunday 18:00 user-local timezone. Generates next 7 days for every active connected account. |
| D10 | Approval flow | Default: **autopublish**. Per-platform toggle on each platform dashboard lets user switch to "approval required." When on, posts stay in `draft` status until user clicks approve. |
| D11 | Strategy | AI-generated per-platform (cadence, content pillars, voice rules, best times). User can override in a settings drawer on each platform dashboard. |
| D12 | Best times | Pull from Zernio `GET /analytics/best-time-to-post` per account. Fallback to `src/lib/insights/platformConfig.ts` `defaultBestTimes`. |
| D13 | Images | gpt-image-1 (OpenAI). Generated at **draft creation** time (Sunday cron, not just-in-time). Hosted on Cloudinary. Prompt prefixed with user's brand identity (colors + logo cues). |
| D14 | Image-required platforms | IG / FB / Pinterest get generated images. X / LinkedIn / Threads / Bluesky get optional images (skip if content fits as text). |
| D15 | Video platforms | TikTok and YouTube can be **connected** but auto-generation is disabled in v1 (status: "video coming soon"). Don't generate empty drafts for these accounts. |
| D16 | Per-platform dashboard | Each `/d/[platform]` route: strategy card + 7-day calendar + autopublish toggle + per-post edit/regen/delete + override drawer. |
| D17 | Sidebar | Connected accounts list (primary nav). "Add account" CTA. Business website moves to user-avatar dropdown. |
| D18 | Trial enforcement | Stripe webhook on `customer.subscription.trial_will_end` (3d) + cron fallback. After trial end without card, freeze account (no cron generation, no publish). |

---

## Per-platform cadence defaults (research-backed, 2025-2026)

Source: Buffer State of Social Media 2025, Hootsuite Benchmarks 2025, Sprout Social Posting Frequency Guide, LinkedIn Creator Playbook 2025.

| Platform | Posts/week (default) | Caption sweet spot | Image required? | Notes |
|---|---|---|---|---|
| Instagram (feed) | 4 | 125-150 chars | Yes | Text-only penalized. Image always generated. |
| Facebook | 2 | 40-80 chars | Yes | Quality > quantity. Image always generated. |
| X / Twitter | 21 (3/day) | ≤280 chars | Optional | Threading boosts reach — generate threads as 3-tweet sequences when topic merits. |
| LinkedIn (personal) | 3 | 100-200 char hooks | Optional | Document carousels get 3× engagement (out of scope v1, ship later). |
| TikTok | — | — | Video | Disabled in v1. Connect-only. |
| YouTube (Shorts) | — | — | Video | Disabled in v1. Connect-only. |
| YouTube (Long) | — | — | Video | Disabled in v1. Connect-only. |
| Pinterest | 7 | 50-100 chars | Yes | Always image. |
| Threads | 3 | 50-300 chars | Optional | Threading native. |
| Bluesky | 3 | ≤300 chars hard | Optional (≤1MB) | 300-char hard limit. 1MB image hard limit. |

Implementation: store these as `DEFAULT_CADENCE` constant in `src/lib/services/strategy.ts`. Strategy generator picks within ±1 of default based on account's historical engagement (from `compute-outcomes` snapshots if available).

---

## Current state inventory

### Delete (complete removal — confirmed by code map)

**Chat interface:**
- `src/app/api/chat/route.ts`
- `src/components/dashboard/ChatPanel.tsx`
- `src/lib/ai/chat-tools.ts` (~720 lines, 5 tools)
- `src/lib/ai/chat-system-prompt.ts`
- `src/lib/ai/rewrite.ts` (LLM rewrite — replace with a service-layer function called from the per-post edit UI)
- `src/lib/rateLimit/chatLimiter.ts`
- `src/lib/schemas/mediaItems.ts` (chat-specific, check for other callers first)

**Wallet / usage ledger:**
- `UsageLedger` model in `src/lib/db/schema.prisma` (lines 203-231) + `User.usageLedger` relation (line 28)
- `src/lib/services/usage.ts`
- `src/lib/constants/usage.ts`
- `src/components/dashboard/UsageLimitModal.tsx`
- `src/lib/stores/usageModalStore.ts`
- `src/components/dashboard/UsageMeter.tsx`
- `src/lib/errors/UsageLimitError.ts`
- `src/app/api/billing/topup/route.ts` (no topups in new model)
- Any axios interceptor that opens the usage modal on 402

**v1/v2 split:**
- `User.version` + `User.firstBatchApproved` columns in `schema.prisma`
- `src/app/api/onboarding/approve-batch/route.ts`
- `src/components/dashboard/FirstBatchApproval.tsx`
- v2 conditional in `src/app/api/dashboard/status/route.ts`
- v2 conditional in `src/inngest/functions/analyze-account.ts` (the `generateFirstBatchIfEligible()` step)
- v2 conditional in `src/components/dashboard/PublishPage.tsx`
- v2 conditional in `src/lib/hooks/useDashboardStatus.ts`
- v2 flag write in `src/lib/better-auth/auth.ts`
- v2 branching in `src/app/(onboarding)/onboarding/OnboardingClient.tsx`

### Keep and extend

- `src/lib/services/bestTimes.ts` — already pulls Zernio + fallback. Wire into new strategy generator.
- `src/inngest/functions/compute-outcomes.ts` — nightly analytics. Use snapshots to refine weekly strategy.
- `src/lib/services/createFromBrief.ts` — extend; the weekly cron will call this per account.
- `src/lib/late/` — Zernio client. Keep as-is.
- `src/lib/stripe/` — extend with trial config (see Phase 8).
- `src/lib/firecrawl/` — extend brand-identity extraction (Phase 2).
- `src/lib/insights/platformConfig.ts` — keep as fallback for best times.
- Cloudinary pipeline (`src/app/api/uploads/sign/route.ts`, `useCloudinaryUpload`) — host AI-generated images.
- Better Auth + magic-link + Google OAuth — unchanged.

---

## Schema changes (single Prisma migration)

```prisma
// User
model User {
  // REMOVE
  version              String   @default("v1")
  firstBatchApproved   Boolean  @default(true)
  usageLedger          UsageLedger[]

  // ADD
  brandIdentity        Json?    // { logoUrl, primaryColor, secondaryColor, accentColor, brandPhotos: string[], styleNotes: string }
  trialEndsAt          DateTime?
  trialNotifiedAt      DateTime?
}

// SocialAccount
model SocialAccount {
  // ADD
  strategy             Json?    // { postsPerWeek, contentPillars: string[], voiceRules: string[], bestTimes: { day:0-6, hour:0-23, score:number }[], imageStyle: string }
  strategyDefinedAt    DateTime?
  autopublish          Boolean  @default(true)
  generationEnabled    Boolean  @default(true)  // false for TikTok/YouTube in v1
}

// PostSuggestion
model PostSuggestion {
  // ADD
  imagePrompt          String?
  imageUrl             String?  // Cloudinary URL post-upload
  imageGeneratedAt     DateTime?
  approvalRequired     Boolean  @default(false)
  approvedAt           DateTime?
}

// DELETE entire model
model UsageLedger { ... }  // remove
```

Migration name: `20260520000000_pivot_to_social_media_manager`.
Backfill: `UPDATE "User" SET "brandIdentity" = NULL, "trialEndsAt" = NULL` (no-op, just confirming columns nullable).

---

## Target architecture

```
   Sign up (Better Auth, magic link or Google) ─► ensureUserProfile (creates LateProfile + scoped Zernio key)
        │
        ▼
   /onboarding/1: URL or description
        │
        ▼
   /onboarding/2: validate extracted knowledgeBase
        │
        ▼
   /onboarding/3: brand identity ──► Firecrawl color extraction + asset upload UI
        │
        ▼
   /onboarding/4: connect (≥1 required) ─► account/connected event
        │
        ▼
   /onboarding/5: Stripe checkout (3-day trial, CC required) ─► land on /d/[platform] only after success
        │
        ▼
   ┌─────────────────────────────────────────────────────────────┐
   │  Inngest: analyze-account                                    │
   │   ├─ pull insights from Zernio                              │
   │   ├─ defineStrategyForAccount() ─► writes SocialAccount.strategy │
   │   └─ trigger first weekly generation NOW (don't wait for cron) │
   └─────────────────────────────────────────────────────────────┘
        │
        ▼
   /d → redirects to /d/[firstConnectedPlatform]
        │
        ▼
   /d/[platform] ─► strategy card + 7-day calendar + autopublish toggle + edit/regen drawer

   ┌──────────────────────────────────────────────────────────────┐
   │ WEEKLY CRON (Inngest, Sunday 18:00 user-local)               │
   │   For each user with active subscription + ≥1 active account:│
   │     For each SocialAccount where generationEnabled = true:   │
   │       1. Refresh strategy if stale (>4 weeks)                │
   │       2. createFromBrief(account, weekStart, postsPerWeek)   │
   │       3. For posts needing image: gpt-image-1 → Cloudinary   │
   │       4. If autopublish: status = scheduled, push to Zernio  │
   │       5. If approval mode: status = draft, notify user       │
   └──────────────────────────────────────────────────────────────┘

   ┌──────────────────────────────────────────────────────────────┐
   │ NIGHTLY CRON (existing compute-outcomes, 3am UTC)            │
   │   Pull Zernio analytics → OutcomeSnapshot                    │
   │   Feeds next strategy refresh                                │
   └──────────────────────────────────────────────────────────────┘
```

---

## Zernio API contract (verified against `docs.zernio.com/llms-full.txt` — 2026-05-19)

- `POST /posts` — schedule a post. Payload: `{ content, scheduledFor (ISO), timezone, platforms: [{ platform, accountId }], mediaUrls?: string[], publishNow?: boolean }`.
- `GET /analytics/best-time-to-post` — schema not documented; **call it and log the shape before relying on it**. Have fallback to `platformConfig.defaultBestTimes` ready.
- `GET /analytics` — engagement metrics per account. Already used by `compute-outcomes.ts`.
- Image attachment: **URLs only** (not bytes). Host on Cloudinary first.
- Post lifecycle: `draft → scheduled → published`. **No edit/cancel endpoint** for scheduled posts — only `posts:delete` and `posts:retry`. This means: in approval mode, keep posts in our DB as `draft` and only call `POST /posts` on approve.
- Hard limits: Bluesky 300 chars, 1MB images. Validate in the strategy generator.
- Rate limits: not documented. Wrap the batch scheduler in a 200ms delay between calls and a circuit-breaker on 429 (back off 5min, retry once).

---

## Phase-by-phase tasks

> Each phase is implemented + tested + committed before starting the next.

### Phase 1 — Schema migration + deletes

- [ ] Write Prisma migration `20260520000000_pivot_to_social_media_manager` per the schema block above.
- [ ] Delete all chat files listed in "Delete" section. Run `tsc --noEmit` after each batch to catch broken imports; fix immediately.
- [ ] Delete all wallet/usage files. Replace `useApi` axios interceptor that opened the usage modal — interceptor stays for other 4xx/5xx but the 402 branch goes.
- [ ] Delete v1/v2 conditionals across all 7 files. Default everyone to the new flow.
- [ ] Delete `FirstBatchApproval.tsx` and `/api/onboarding/approve-batch/route.ts`.
- [ ] Apply migration locally (Supabase port 54422). Run `prisma generate`.
- [ ] Commit: `refactor: strip chat interface, usage ledger, and v1/v2 split`.

**Smoke test:** `npm run dev` starts cleanly. `/d` redirects to onboarding for users without `knowledgeBase`. Existing users (already onboarded) hit `/d` and see something — likely broken, that's fine (phase 6 rebuilds it).

### Phase 2 — Onboarding rewrite

- [ ] Rewrite `OnboardingClient.tsx` for the 4-step flow. No version branching.
- [ ] Step 3 (brand identity) UI: invoke `/ui-ux-pro-max` + `/frontend-design` first. Auto-populate from website scrape (extend `src/lib/firecrawl/` to extract dominant colors + logo). If incomplete, show manual fields (color picker + logo upload via Cloudinary).
- [ ] Step 4 (connect) UI: show all 9 platforms in the existing order from `platformConfig`. No reorder, no highlight. Block "Continue" until `lateProfile.socialAccounts.length >= 1`. Skip link removed.
- [ ] On step 4 completion → redirect to `/d/[firstConnectedPlatform]`.
- [ ] Extend `src/lib/services/brandIdentity.ts` (new): given a `User`, scrape with Firecrawl, return `{ primaryColor, secondaryColor, logoUrl, brandPhotos: string[], styleNotes: string }`. Persist to `User.brandIdentity`.
- [ ] Commit: `feat: rewrite onboarding with brand identity + mandatory connect`.

**Smoke test:** sign up fresh test user, walk all 4 steps end-to-end. Connect Instagram. Land on `/d/instagram`. Use `verifier` agent.

### Phase 3 — Strategy generation service

- [ ] Create `src/lib/services/strategy.ts` exporting `defineStrategyForAccount(accountId): Promise<Strategy>`.
- [ ] Strategy shape: `{ postsPerWeek: number, contentPillars: string[3-5], voiceRules: string[2-4], bestTimes: { day, hour, score }[], imageStyle: string }`.
- [ ] Inputs: `SocialAccount` (with platform), `User.knowledgeBase`, `User.brandIdentity`, latest `OutcomeSnapshot` for engagement signal, `getBestSlots()` for times, `DEFAULT_CADENCE` for cadence floor/ceiling.
- [ ] Uses Anthropic Sonnet 4.6 via `generateObject` (with Claude-safe schema per the gotcha — no `minItems`/`maxItems`; trim in code).
- [ ] Persist to `SocialAccount.strategy` + `strategyDefinedAt`.
- [ ] Wire call into `analyze-account.ts`: after `mark-analysis-completed`, call `defineStrategyForAccount` for the freshly-connected account.
- [ ] For TikTok / YouTube*: skip strategy generation; set `generationEnabled = false`.
- [ ] Commit: `feat: per-platform strategy generation`.

**Smoke test:** trigger `account/connected` event for a test Instagram account. Inspect `SocialAccount.strategy` in DB — confirm pillars + cadence + times present.

### Phase 4 — Weekly cron generator

- [ ] New Inngest function `src/inngest/functions/weekly-generate.ts` with `cron: "0 18 * * 0"` (Sunday 18:00 UTC — we adjust per-user timezone inside the function using existing tz logic from `analyze-account.ts`).
- [ ] For each user with `subscription.status in ('active','trialing')`: for each `SocialAccount` where `generationEnabled = true`: call `createFromBrief(account, weekStart, account.strategy.postsPerWeek)`.
- [ ] `createFromBrief` extended to accept `weekStart: Date` + `count: number`; generates post copy via existing Anthropic flow, sets `scheduledAt` from `account.strategy.bestTimes` spread across the week.
- [ ] If `account.autopublish === true`: status = `scheduled`, call Zernio `POST /posts`. If `false`: status = `draft`, no Zernio call (await user approval).
- [ ] On Zernio 429: backoff 5min, retry once. On further failure: log + leave as `draft` for user.
- [ ] **Also trigger from `analyze-account.ts` after strategy is defined** — first-week posts shouldn't wait until Sunday.
- [ ] Commit: `feat: weekly cron for per-account generation`.

**Smoke test:** manually trigger the Inngest function for the test user. Confirm N posts appear per account with correct schedules. Check Zernio dashboard that scheduled posts show up there.

### Phase 5 — Image generation pipeline

- [ ] Add `OPENAI_API_KEY` to `.env` + `docs/environment.md`.
- [ ] Install `openai` SDK (`npm i openai`).
- [ ] New `src/lib/ai/generateImage.ts`: given `(postCopy, platform, brandIdentity)`, build a prompt that includes brand colors + logo style notes + platform-appropriate composition (IG = square, Pinterest = vertical 2:3, FB = landscape), call gpt-image-1, return image bytes.
- [ ] New `src/lib/services/postImage.ts`: orchestrate generate → upload to Cloudinary → write `PostSuggestion.imageUrl` + `imagePrompt` + `imageGeneratedAt`.
- [ ] Wire into weekly cron: for posts on image-required platforms (D14 list), generate image after copy is written, before scheduling to Zernio.
- [ ] **Cost safeguard:** per-user weekly cap (configurable, default 50 images/week). If exceeded, fall back to text-only post for that week and log a warning.
- [ ] Commit: `feat: brand-styled image generation via gpt-image-1`.

**Smoke test:** generate one image for the test user's Instagram account. Verify it lands on Cloudinary, the URL is on `PostSuggestion.imageUrl`, and the image visually reflects the brand colors. (Open the image manually and eyeball.)

### Phase 6 — Per-platform dashboard UI

> Biggest UI lift. Invoke `/ui-ux-pro-max` then `/frontend-design` for every screen before implementing.

- [ ] New route `/d/[platform]/page.tsx`. Platform param validated against `PLATFORM_CONFIG`.
- [ ] Components:
  - `<PlatformStrategyCard>` — shows pillars + cadence + best times. "Customize" button → opens override drawer.
  - `<UpcomingPostsCalendar>` — 7-day grid, each cell = the post scheduled for that day. Click → opens edit drawer.
  - `<AutopublishToggle>` — pill switch. On flip: PATCH `/api/accounts/[id]` with new `autopublish` value. If toggling to "approval mode" and there are scheduled posts in Zernio, surface "what about the X already scheduled?" warning (we can't un-schedule via Zernio; only future cron output is affected).
  - `<PostEditDrawer>` — caption editor + image preview + regen-image button + delete button + schedule-time picker.
  - `<StrategyOverrideDrawer>` — edit cadence (slider within ±2 of default), pillars (chips), best times (day+hour picker).
- [ ] New routes for the actions:
  - `PATCH /api/accounts/[id]` (toggle autopublish, update strategy override)
  - `PATCH /api/posts/[id]` (edit caption, change schedule)
  - `POST /api/posts/[id]/regenerate-image`
  - `DELETE /api/posts/[id]`
  - `POST /api/posts/[id]/approve` (approval-mode → moves to Zernio)
- [ ] All routes thin: validate → service → return. Business logic in `src/lib/services/posts.ts` + `src/lib/services/strategy.ts`.
- [ ] Mobile-responsive (the calendar collapses to vertical list <md).
- [ ] Commit: `feat: per-platform dashboard with strategy + calendar + edit drawer`.

**Smoke test:** verifier agent walks: open `/d/instagram` → see strategy + calendar → edit a post → toggle approval mode → approve a post.

### Phase 7 — Sidebar restructure

- [ ] Rewrite `src/components/dashboard/Sidebar.tsx`.
- [ ] Primary nav: connected accounts list (clicking → `/d/[platform]/[?accountId]` when user has multiple accounts on same platform). Each row: platform logo + handle + status dot.
- [ ] "+ Add account" CTA at bottom of the list → opens the existing connect modal (same `ConnectAccountButtons` used in onboarding).
- [ ] User avatar dropdown (bottom): name, email, **business website link**, "Billing", "Sign out".
- [ ] Delete the standalone "Home / Publish / Analyze / Settings" entries — settings now per-platform; analyze surfaces inside each platform dashboard.
- [ ] Commit: `feat: account-first sidebar restructure`.

**Smoke test:** open dashboard, click each connected account, see it route to the right dashboard. Click "+ Add account" → modal opens. Click avatar → dropdown shows business URL.

### Phase 8 — Stripe trial flow rework (checkout at end of onboarding)

- [ ] Update `src/lib/stripe/checkout.ts` (or equivalent): every new Checkout Session passes `subscription_data: { trial_period_days: 3 }`.
- [ ] Onboarding flow change: after step 4 (connect, ≥1 social account confirmed), redirect to a new `/onboarding/checkout` step that immediately bounces to a fresh Stripe Checkout Session. `success_url` = `/d/[firstConnectedPlatform]`, `cancel_url` = `/onboarding/checkout?cancelled=1` with a "resume" CTA.
- [ ] **Onboarding gate** in `(onboarding)/layout.tsx`: a user can advance through steps 1-4 without a subscription, but step 5 (checkout) is required before `/d` becomes reachable. Add an `onboardingCompleted: boolean` derived from `User.subscription?.status in ('active','trialing')` + `User.lateProfile.socialAccounts.length >= 1` + `User.knowledgeBase !== null`.
- [ ] On successful checkout return (`/api/checkout/success` or webhook → `customer.subscription.created`), set `User.trialEndsAt = subscription.trial_end`. The `success_url` lands the user on their first platform dashboard — `analyze-account` (triggered at step 4) should have either completed or be visibly in-progress on that screen.
- [ ] **Resume-able onboarding**: if a user bounces from Stripe Checkout (closes tab), next login should land them back at `/onboarding/checkout` rather than re-walking steps 1-4. Their `knowledgeBase`, `brandIdentity`, and connected accounts are already persisted.
- [ ] Webhook handler additions:
  - `customer.subscription.trial_will_end` (Stripe fires 3 days before; for a 3-day trial that's at start — useful to send "your trial started" email via Brevo).
  - `customer.subscription.updated` where `status` flipped to `past_due` or `canceled` → mark account frozen.
- [ ] Add a **frozen-account gate** in `(dashboard)/layout.tsx`: checks subscription status; if frozen (trial ended, no successful charge, or cancelled), show a "reactivate" full-page block with a button that reopens Stripe checkout. Cron skips frozen users.
- [ ] Remove every reference to legacy `starter` / `business` plans from UI (CLAUDE.md notes they resolve to `pro` server-side — keep the resolution but stop showing them).
- [ ] Commit: `feat: 3-day Stripe trial at end of onboarding + frozen-account gate`.

**Smoke test:** new test signup → walk through onboarding steps 1-4 → land on `/onboarding/checkout` → Stripe checkout opens → enter test card → land on `/d/[platform]`. Confirm `User.trialEndsAt` is 3 days out. Then: in a second test session, abandon onboarding at the Stripe checkout step → log out → log back in → confirm you resume at `/onboarding/checkout` (not `/onboarding/1`). Then: manually expire trial in Stripe dashboard → confirm `(dashboard)/layout.tsx` shows the freeze gate.

### Phase 9 — Test, verify, ship

- [ ] **Verifier agent end-to-end run.** Fresh test user. Full flow: signup → Stripe trial card → onboarding (URL → KB → brand → IG connect) → land on `/d/instagram` → wait for analyze-account to complete → see strategy + first week of posts → toggle approval mode → approve one post → confirm Zernio shows it scheduled.
- [ ] Manual smoke checklist (run all):
  - [ ] Reddit-orphan accounts in DB don't crash anything (no IG/FB profile but in old data).
  - [ ] Existing paying users (already had v1=`v1` + Stripe sub): log in → land on new onboarding (since `knowledgeBase` exists, skip to step 3 or step 4). Verify no double-charge.
  - [ ] Bluesky 300-char limit: generate a strategy that produces a post >300 chars; confirm validator trims or regenerates.
  - [ ] Bluesky image >1MB: confirm pipeline downsizes or skips image.
  - [ ] Sunday cron actually fires (use Inngest dev UI to inspect schedule).
  - [ ] Image-cost cap: simulate user with 60 image-needing posts/week; confirm 50 generate and the rest fall back to text-only with warning.
  - [ ] Zernio 429: stub the client to return 429 once; confirm 5min backoff + retry + final failure logs.
- [ ] Type check passes (`npm run vercel-build` — without actually deploying, this catches everything).
- [ ] Sanity-check the `.env` documentation (`docs/environment.md`) for the new `OPENAI_API_KEY` entry.
- [ ] Commit: `chore: end-to-end smoke verified, ready to ship`.

---

## Stop conditions — ask the user, don't guess

If you hit any of these, stop and ask:

1. The Firecrawl scrape can't reliably extract brand colors and the manual color-picker UI feels clunky → propose an alternative UX.
2. Zernio's `best-time-to-post` endpoint returns an unexpected shape → log the actual response, ask whether to use it raw, normalize it, or stick to `platformConfig.defaultBestTimes`.
3. gpt-image-1 API behaves unexpectedly (cost, latency, quality) → surface a sample + cost-per-image; ask whether to swap providers (Stability, Ideogram, etc.).
4. Approval-mode UX needs more than a toggle (e.g., per-post bulk approve, slack/email approval) → ask before designing.
5. Migrating existing paying users surfaces edge cases (annual plan, legacy `starter`/`business`, mid-billing-cycle changes) → ask before writing the migration script.
6. The 4-step onboarding becomes >5 minutes to complete in testing → ask whether to trim or defer steps.

---

## Voice & copy rules (reminder)

- **Never** mention Anthropic, Claude, OpenAI in user-facing copy. Use "proprietary AI engine" or just say what it does ("writes your captions", "plans your week").
- **Never** use "AI" in product UX copy.
- **Never** highlight or reorder platforms in the connect picker.
- Plain language for SMB-facing copy. Startup jargon OK for founder/creator-facing.
- Coral `#ec6f5b` accent only. Not destructive.

---

## What this prompt produces

A working, deployable PostClaw that:

- Takes a fresh sign-up from "I gave you my URL" to "my first week of posts is live on 4 platforms" in <10 minutes.
- Runs autonomously week after week without user intervention.
- Lets the user override anything: cadence, times, pillars, individual posts, approval mode.
- Surfaces the strategy so users **see** the manager working.
- Charges $49/mo after a 3-day trial — no usage limits, no surprise paywalls.

That's the product. Now build it.
