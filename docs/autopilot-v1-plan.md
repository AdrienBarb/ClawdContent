# PostClaw Autopilot v1 — Implementation Plan

> Status: **APPROVED by founder 2026-06-11** — ready for implementation (execute epic by epic via `/apex -a -x`).
> Source: multi-agent codebase exploration + two verified deep-research passes (market/UX + media models, primary sources checked 2026-06-11).
> Companion memory: `~/.claude/projects/-Users-adrien-code-AdrienBarb-ClawdContent/memory/autopilot_gap_analysis.md` + `autopilot_research_findings.md`.

## 0. The one-line goal

Deliver the hero promise: **"Grow your Facebook & Instagram on autopilot."** Every week PostClaw drafts a full week of posts (text + AI-generated media) following the account's strategy, schedules them at best times, emails a digest, and publishes automatically. The user can steer, edit, or veto — but never has to.

## 1. Vision & user journey

PostClaw is an employee you hired, not a tool you operate. The app is the window on your manager's work.

1. **Onboarding (~5 min, exists at ~90%)** — website URL → background scrape/KB extraction → connect IG/FB → goal → validate business info → validate branding (**v1.1 additions: logo upload — route exists at `/api/branding/logo` — + optional brand photos**) → paywall with strategy reveal → $99/mo. Paywall CTA copy: *"Your first week of posts will be ready in minutes."*
2. **Magic moment (right after payment)** — while the user checks out, the autopilot builds week 1: post count & formats from the strategy's `formatPlan`, captions stuffed with concrete `knowledgeBase` specifics (menu items, offers, locations, product names — the verified category-wide gap), media generated, scheduled at best times. User lands on "Your week is ready", scrolls the timeline, edits/vetoes anything. Default mode = full auto: everything is already committed and will fire.
3. **Weekly loop (the heartbeat)** — every **Sunday 17:00 user-local time**: refresh insights → plan next week (strategy + KB + prior edits/vetoes as signal + optional user brief) → generate media → schedule at best times → **digest email ~18:00** ("Your week is ready — 5 posts, first goes live Tuesday 9:00") with per-post preview + Edit / Regenerate / Veto buttons (signed one-click links, valid until each post's fire time) → posts fire automatically via Zernio.
4. **Optional touchpoints** — brief bar ("What's coming up this week?") anytime, feeds next batch; per-post edit sheet; simple "what worked" results view.
5. **Trust model (founder decision)** — **default = FULL AUTO**. Settings toggle to switch to review mode (week requires explicit "Launch my week" approval before anything commits). Plus a global pause toggle.
6. **Safety nets** — account disconnected → email + banner + autopilot paused for that account; post failed → 1 auto-retry then email + "needs attention" card; media generation failed twice → fall back to static image post or `needs_media` flag in digest (IG posts never go out without media); missing strategy → auto-regenerate, never an empty screen.

**Explicitly OUT of v1:** weekly strategy auto-adaptation (deferred — content follows the connect-time strategy; marketing copy makes no explicit weekly-adaptation promise, verified), comment/DM handling, design editor, multi-language.

## 2. Verified research conclusions (don't re-litigate)

- **Market wedge:** Predis.ai (closest competitor, $19/mo) meters with credits (no rollover) and hard-caps auto-posting at **2-3 posts/day even at $212/mo**; Buffer's AI is a bolt-on. Our positioning: **"no credits, no caps"**, flat $99. Do NOT claim cron+digest+veto is unique (refuted) or that credit exhaustion drives Predis churn (refuted).
- **Category-wide #1 complaint (verified):** generic, brand-blind AI output. Our moat = deep knowledgeBase injection into every caption + native-preview review UX.
- **Media architecture: SINGLE PROVIDER = Google Gemini API.** ALL media is AI-generated (founder dropped Satori/templates entirely on 2026-06-11). One key, one SDK (`@google/genai`), one invoice — images (incl. text cards + carousels) AND video under one API. Verified the only single-provider that covers everything: OpenAI disqualified (no video — Sora API EOL 2026-09-24; and gpt-image can't hit exact IG pixel dims since 1080 isn't a multiple of 16).

### Media stack (single provider Google Gemini — pricing verified on official Gemini API docs 2026-06-11)

| Need | Model | Cost (Batch tier for the Sunday burst) |
|---|---|---|
| Text cards (promo/sale/quote/tip) + ALL carousel slides + hero/brand-consistent shots | **Nano Banana Pro** (`gemini-3-pro-image`) | ~$0.067/img (1K-2K Batch), $0.134 Standard |
| Photoreal/lifestyle images with NO on-image text (food, venues, products, people) | **Nano Banana 2** (`gemini-3.1-flash-image`) | ~$0.034-0.050/img Batch ($0.067-0.101 Standard) |
| Reels / 9:16 video | **Veo 3.1 Fast** (`veo-3.1-fast-generate-preview`) | $0.12/s @1080p → ~$0.96 per 8s clip; escalate to Veo 3.1 Standard ($0.40/s) only for hero clips |

Key facts:
- **TEXT TRADEOFF ACCEPTED (founder decision 2026-06-11): Google + OCR guard on DAY 1.** Nano Banana Pro trails OpenAI gpt-image-2 by ~6-15% on headline/label/price-callout text accuracy. Mitigation = mandatory headless **OCR-diff + regenerate guard** on every text-bearing image/slide (OCR the render, diff vs intended copy, regenerate that single asset on mismatch). gpt-image escape hatch (a 2nd fal.ai key routing only text-heavy slides) is DOCUMENTED ONLY — not built day 1.
- **Aspect ratios:** Gemini 3 image models natively support 4:5 and 9:16 (confirmed). BUT you pick ratio + resolution tier (1K/2K/4K), NOT arbitrary WxH — generate at 2K and add ONE deterministic downscale/crop step (e.g. `sharp`) to land exactly on 1080×1350 / 1080×1920 before Zernio. Do NOT hardcode intermediate pixel dims (unverifiable).
- **Carousels = chained generation, NO atomic deck call exists on any provider.** Recipe (anti-drift, fully AI, zero templates): (1) build per-user brand kit once (logo, 1-2 style/color reference images, exact hex codes, a fixed "style-anchor phrase"). (2) Slide 1 = the cover/style anchor via Nano Banana Pro at 4:5, passing logo + brand swatch + style phrase + hex + headline. (3) Slides 2..N: re-anchor EVERY slide to the COVER (not slide→slide→slide — cumulative chaining drifts palette past ~7-8 gens), passing cover as style/layout ref + logo + style phrase + hex, changing only that slide's headline/subject. Keep one aspect ratio for the set. OCR-verify each slide. ~$0.40 per 6-slide carousel on Batch.
- **Video = image-to-video for brand continuity:** seed a Veo Reel from a Nano Banana hero frame. Veo 3.1 = native 9:16, native audio, max 8s (4s/6s also), 1080p. Async create→poll → fits the Inngest Sunday batch (submit, poll/resume, store to Supabase, hand URL to Zernio).
- **Veo 3.1 is paid PREVIEW (not GA):** version-pinned `-preview` model ids — wrap in a constant, plan a GA migration. EU/UK/CH/MENA: Veo `personGeneration` restricted to `allow_adult` (founder is EU-based — verify region availability for people-in-video).
- **SynthID + C2PA are baked into EVERY Google image/video and cannot be removed.** With 2026 Google-Meta C2PA alignment, IG/FB will likely surface Meta's "AI info" label on output. Unavoidable with Google — disclose-by-design, not a bug.
- **Persistence:** Gemini returns inline base64 (images) / a short-lived operation result (video) — download to Supabase `media` bucket immediately. No free tier on any image or video model.
- **Reliability:** run the whole-fleet Sunday burst on the Batch image tier (or Vertex AI for higher rate limits — identical code) with retry/backoff; stagger users (Inngest concurrency keys), don't fire all at once (Gemini image endpoints show peak-load 503s).
- **Cost guardrails:** default **2 Reels/week/user**; total media ≈ **$2-3/user/week (~$8-13/user/mo worst case), <6% of ARPU.** Use Batch images + Veo Fast as defaults; reserve Standard tiers for hero assets.

## 3. Current-state facts (verified by multi-agent exploration — saves you re-exploring)

- **Every autopilot building block already exists headless**, none has a scheduled trigger:
  - `refreshInsights` Inngest fn re-runs `computeInsights` AND `computeStrategy` (`src/inngest/functions/analyze-account.ts:136-162`); `account/refresh-insights` is only sent from reconnect detection (`src/lib/services/accounts.ts:124-137`) + backfill script.
  - `createFromBrief` (`src/lib/services/createFromBrief.ts`) drafts strategy-steered posts as a plain service call (reads strategy via `parseStrategy` + `formatStrategyContext` — pillars/doubleDown/stop only); only reachable via `/api/chat`.
  - Fire-and-forget scheduled publishing is LIVE: `publishSuggestion.ts:232-233` → Zernio `createPost` with `publishNow:false` + `scheduledAt`; Zernio fires with zero clicks.
  - Inngest cron pattern proven: `compute-outcomes` runs `0 3 * * *`.
- **Chat has SEVEN tools, not five** (CLAUDE.md stale): + `publish_drafts`, `schedule_drafts`. `schedule_drafts` already smart-fills times from best-times when user says "plan my week".
- `OutcomeSnapshot` (nightly, users ≥5 published posts, 14-day window) feeds chat prompt only — wire it into the week planner.
- `Insights.meta.nextRefreshAt` (+7d) is zombie metadata; `User.lastSuggestionsGeneratedAt` IS used — generation cooldown in `src/lib/services/rateLimit.ts` (autopilot must bypass; keep for chat as anti-abuse).
- `GET /api/strategy` is orphaned (no UI consumes it). `onboardingSamples` service + `/api/onboarding/samples` is dead code → delete (consistent with paywall-shows-strategy decision).
- Published posts: local `PostSuggestion` row is **deleted** after Zernio commit; UI reads upcoming/published from Zernio (`/d/channels` pattern). Keep this pattern.
- Paywall can hang on "building" forever if Inngest strategy generation fails → fallback needed (E6).
- 4 Inngest functions registered in `src/inngest/index.ts`: analyzeAccount, refreshInsights, computeOutcomes, onboardingWebsiteAnalyze.

## 4. Architecture

### 4.1 Data model (one migration)

- **`WeeklyBatch`** (new): `id`, `userId`, `weekStart DateTime`, `status` ("generating" | "ready" | "failed"), `mode` ("full_auto" | "review", snapshot at generation), `brief String?` (consumed user brief), `digestSentAt DateTime?`, `approvedAt DateTime?`, `createdAt`. Relation: `PostSuggestion.batchId String?`.
- **`PostSuggestion`**: + `batchId`, + `status String` ("draft" | "needs_media") — plain strings w/ comments, NO enums (project convention).
- **`User`**: + `autopilotMode String @default("full_auto")` ("full_auto" | "review"), + `autopilotPausedAt DateTime?`, + `pendingBrief String?`, + `styleKit Json?` (frozen style prompt block + reference image URLs + palette + seed family; built once from knowledgeBase, ensures week-over-week visual consistency).
- **DELETE**: `UsageLedger` model, `/api/billing/topup` route, usage constants, `src/lib/services/usage.ts`, `topup.ts`.

State convention: full_auto → posts committed to Zernio at generation, local rows deleted (existing pattern); timeline reads upcoming from Zernio. Local rows persist only for `needs_media` posts and, in review mode, the whole staged week until approval.

### 4.2 Media pipeline (`src/lib/media/` — new adapter dir, service-layer rules apply)

Single provider: **Google Gemini API** (`@google/genai`, key `GEMINI_API_KEY`). All media AI-generated, no templates.
- `geminiImage.ts` — Nano Banana Pro (`gemini-3-pro-image`) for text cards/carousels/hero, Nano Banana 2 (`gemini-3.1-flash-image`) for no-text photoreal; Batch tier for the Sunday burst; pass brand kit reference images + hex codes; request 4:5 / 9:16; returns base64 → Supabase.
- `geminiVideo.ts` — Veo 3.1 Fast (`veo-3.1-fast-generate-preview`) image-to-video from a hero frame; async create→poll inside an Inngest step; model id behind a constant (preview → GA migration).
- `ocrGuard.ts` — **mandatory day-1 text QA**: OCR each text-bearing image/slide, diff vs intended copy, regenerate the single asset on mismatch (bounded retries). This is the agreed mitigation for Google's text gap vs gpt-image.
- `carousel.ts` — chained slide generation anchored to the cover (anti-drift recipe in §2); re-inject hex + style-anchor phrase per slide; one aspect ratio for the set.
- `styleKit.ts` — build/store per-user brand kit (logo, 1-2 style/color refs, exact hex codes, frozen style-anchor phrase) once from knowledgeBase.
- `imageSize.ts` — deterministic downscale/crop (`sharp`) to exact 1080×1350 / 1080×1920 after generation.
- `mediaPlan.ts` — map a planned post's format → the right generator; degrade on failure (video→static image; image→`needs_media`).
- Reuse `mediaValidation.ts` platform rules before commit. Persist every asset to Supabase `media` immediately (Gemini outputs are inline/short-lived).
- Escape hatch (DOCUMENTED, not built): a 2nd `fal.ai` key routing only text-heavy slides to `gpt-image-2` if Google text accuracy ever drives churn.
- `photoreal.ts` — FLUX.2 [pro] adapter (+ Gemini fallback behind config flag); per-placement native sizes (1:1 1024², 4:5 1080×1350, 9:16 1080×1920).
- `reels.ts` — brand still (FLUX 1080×1920) → Seedance 1.5 Pro i2v (4-12s, audio off, 9:16) → MP4 → Supabase (+ Veo fallback flag).
- `styleKit.ts` — build/refresh per-user style kit from knowledgeBase.
- `mediaPlan.ts` — maps a planned post (format from strategy formatPlan) to the right generator; retry ×2 → degrade (video→static image; image→`needs_media`).
- Reuse `mediaValidation.ts` platform rules before commit.

### 4.3 Autopilot loop (Inngest)

- **`autopilot-dispatch`** — cron `0 * * * *`: select users where local time (`User.timezone`) == Sunday 17:00, active subscription, `autopilotPausedAt` null, ≥1 supported connected account, no `WeeklyBatch` for the coming `weekStart` (idempotency) → send `autopilot/generate-week` per user.
- **`autopilot-generate-week`** — steps with retries, concurrency-keyed per user:
  1. `refresh-insights` per account (reuse `computeInsights`, source "all")
  2. `plan-week` (LLM, generateObject): inputs = strategy (per account), knowledgeBase, goal, best times, `OutcomeSnapshot`, `pendingBrief` (consume + clear), recent published posts (no repetition); output = per-account post list: day/time slot, format (per formatPlan + cadence target), topic, media plan. Caps: cadence target per account, ≤2 Reels/user/week, ≤60 video-seconds/user/week.
  3. `captions` — reuse `createFromBrief` internals / `promptContext` voice fingerprint; inject concrete KB specifics into every caption.
  4. `media` — parallel steps via `mediaPlan.ts` (Gemini image base64 / Veo create→poll), each asset through `ocrGuard` (text-bearing) + `imageSize` downscale, persisted to Supabase.
  5. `commit` — full_auto: validate + Zernio `createPost(publishNow:false, scheduledAt)` per post (system-initiated variant of `publishOrScheduleSuggestion`: bypass chat cooldown, no UsageLedger, respect soft-lock/idempotency via `publishedExternalId`); review: stage locally with `scheduledAt`.
  6. `digest` — send via Resend (~18:00 local).
  7. Failure handling: media fail ×2 → degrade; whole-batch fail → batch `status:"failed"` + alert email + retry next hour (max 3).
- **First week**: Stripe webhook (`handleCheckoutCompleted` / `handleSubscriptionCreated`, after `onboardingCompletedAt`) → send `autopilot/generate-week` (`reason:"first_week"`). `/d` shows "Preparing your first week…" until batch `ready` (extend `/api/dashboard/status` polling).
- **Zernio webhook** `post.failed` → `retryPost` once → on second failure email alert + attention card.
- Reminder for any CLI scripts: Inngest constructor needs explicit `eventKey` + `isDev:false`.

### 4.4 Digest & transactional email (Resend)

- Consolidate Brevo → Resend (`src/lib/resend/` exists); React Email templates (`npm run email:dev` tooling exists).
- **Weekly digest**: per post — rendered preview image, caption excerpt, scheduled time; buttons **Edit / Regenerate / Veto**. Veto + Regenerate = signed one-click action links (no login; HMAC token: userId + postRef + action + expiry = post fire time) → `/api/autopilot/actions` route. Edit deep-links into the app.
- Review mode variant: single **"Launch my week"** CTA (approves + commits batch).
- Alerts: post failed, account disconnected (reconnect link), batch failed.

### 4.5 UI v2 — Option A "one page" (follow `src/components/dashboard/CLAUDE.md` design system; coral accent; no gratuitous animations; `useApi` hooks only; min-w-0 on flex chains)

- **Navbar** (sidebar deleted): logo · **Ma semaine** (`/d`) · **Résultats** (`/d/results`) · account chips · avatar menu → Mon business, Comptes, Médias, Facturation, Réglages.
- **`/d` = week timeline**: autopilot status banner ("next batch Sunday 6pm" / "preparing…"), brief bar ("Quoi de neuf cette semaine ?" → writes `pendingBrief`; expandable to full ChatPanel for power users — chat tools stay), attention strip pinned top (needs_media, failed, disconnected, review-pending), then posts grouped by day, then "Published this week" with mini-stats.
- **Native preview cards** (founder requirement): `InstagramPostPreview` + `FacebookPostPreview` — render posts EXACTLY as they'll appear (avatar, username, media/carousel dots, like row, truncated caption "…more" / FB page header + reactions bar). Reels show 9:16 cover + ▶.
- **Edit sheet** per post: caption editor, media regenerate / upload-replace (Supabase), time picker, veto. Mutations go to Zernio (`updatePost` / `deletePost`) for committed posts, local rows for staged/needs_media.
- **`/d/results`**: trimmed version of existing analytics (KPIs + top posts; not an analyst dashboard).
- **Settings**: autopilot mode toggle (full_auto default ↔ review), pause autopilot, timezone (exists).
- Mobile-first (digest links land here).

## 5. Epics & task order

| # | Epic | Size | Content |
|---|---|---|---|
| **E1** | Foundations | M | Prisma migration (WeeklyBatch, User/PostSuggestion fields) · delete UsageLedger/topup/usage service + adjust chat tools · Brevo→Resend consolidation + React Email base |
| **E2** | Media pipeline (Google Gemini, single provider) | L | `@google/genai` client · geminiImage (Nano Banana Pro + 2) · geminiVideo (Veo 3.1 Fast i2v) · **ocrGuard (day-1 text QA)** · carousel chained anti-drift · styleKit · imageSize downscale to exact IG dims · mediaPlan + degradation + Supabase persistence |
| **E3** | Autopilot loop | L | planWeek service · captions reuse · autopilot-dispatch (tz-aware hourly cron) · generate-week function · first-week trigger post-checkout · system commit path (cooldown bypass, idempotency) |
| **E4** | Digest & actions | M | digest React Email template · signed action tokens + `/api/autopilot/actions` · review-mode "Launch my week" · failure/disconnect alert emails |
| **E5** | UI v2 | L | navbar + sidebar removal + route consolidation · week timeline · IG/FB native preview cards · brief bar · edit sheet · `/d/results` · settings toggles · post-payment "preparing" landing |
| **E6** | Safety nets & polish | S | post.failed retry+alert · paywall "building" fallback · PostHog loop events (batch_generated, digest_sent, post_vetoed, mode_switched, media_degraded) · CLAUDE.md update (7 tools + new architecture) · SEO "7 more platforms" string fix · delete dead `onboardingSamples` |
| **E7** | Onboarding v1.1 | S | logo upload + optional brand photos at branding step · paywall CTA copy "first week ready in minutes" |

**Order:** E1 → E2 ∥ E3 → E4 → E5 (preview components can start in parallel with E2) → E6/E7. Critical path = E2+E3.
**Execution:** founder's preferred mode = `/apex -a -x` (autonomous + adversarial review), epic by epic, starting **E1+E2**.

## 6. Founder decisions log (2026-06-11 — do not re-ask)

1. Approval model: **full autopilot with veto window**, DEFAULT = full_auto; optional toggle for review mode. (Inverse of graduated-trust research suggestion — founder's explicit call.)
2. Media: AI-generated by default, follows branding (handle no-branding case) AND strategy formatPlan; user can override with own media; stored in Supabase.
3. Weekly strategy auto-adaptation: **deferred, out of v1**.
4. User steering: optional (regenerate / "post about X"); zero-input default.
5. **UsageLedger removed entirely** (light in-code chat cooldown stays as anti-abuse; autopilot bypasses).
6. Transactional email: **Resend** (migrate off Brevo).
7. Video/Reels: **IN v1 scope** ("everything functional, simple, precise, efficient").
8. UX: Option A single page, no sidebar, navbar + avatar menu; **native IG/FB preview cards**.
9. Batch timing: **Sunday 17:00 user-local generation, ~18:00 digest**. Cap **2 Reels/week** default.
10. **OutcomesSection: KEEP AS-IS, do not touch** (founder overruled the fake-testimonials concern — flagged 2026-06-11, his call).
11. **Media = SINGLE PROVIDER Google Gemini, NO Satori/templates** (founder 2026-06-11): all media AI-generated. Nano Banana Pro (text cards/carousels/hero) + Nano Banana 2 (photoreal) + Veo 3.1 Fast (Reels). **Accept the ~6-15% text-accuracy gap vs gpt-image and ship Google + OCR guard on day 1**; gpt-image via fal.ai is a documented escape hatch only, not built day 1. Verified: OpenAI can't be the single provider (Sora video EOL 2026-09-24; no native exact IG pixel dims).

## 7. Standing project rules (from CLAUDE.md + memory — apply everywhere)

- Never mention AI providers user-facing; never the word "AI" in product UX copy.
- Anthropic generateObject: no minItems/maxItems on Zod arrays — trim in code.
- Zernio is "Late" in code; `day_of_week` 0=Monday; media types image/video/gif/document; immediate posts need `publishNow:true`.
- Prisma 7 adapter-pg only; routes thin → services; no barrel imports; Server Components default; `useApi` for client fetching.
- Never test by posting on real user accounts.
- New env vars to document in `docs/environment.md`: `GEMINI_API_KEY` (all media — images + video), `RESEND_API_KEY`, autopilot action-token secret. (`FAL_API_KEY` only if/when the gpt-image escape hatch is ever built — not day 1.)
