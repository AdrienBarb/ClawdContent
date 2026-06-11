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
- **Media architecture: template-first, not diffusion-first** (this is how Predis actually works — layered templates, locked brand layers, AI-editable text slots).

### Media stack (pricing verified on primary sources 2026-06-11)

| Format | Primary | Cost | Fallback (config-switchable) |
|---|---|---|---|
| Quote/tip cards, carousel slides | **Satori** (HTML/CSS→SVG, JSX templates) + resvg → PNG | ~$0 | — |
| Photoreal/lifestyle images | **FLUX.2 [pro]** via fal.ai | $0.03/img @1MP, $0.045 @4:5 1080×1350 | gemini-3.1-flash-image (Nano Banana 2, GA, $0.067/1K) |
| Reels / video | **Seedance 1.5 Pro image-to-video** via fal.ai | ~$0.026/s silent @720p (audio OFF by default — IG provides music) | Veo 3.1 Fast via Gemini API ($0.10/s, 8s max, 2-day retention → download immediately) |
| Text inside generated scenes | Ideogram 4.0 (appoint) | $0.03–0.10/img | — |

Key facts:
- **Image-to-video is the architecture**: generate a brand still at 1080×1920 (FLUX, brand hex colors in prompt — FLUX honors exact hex) then animate with Seedance. Text-to-video cannot hold brand colors/logos. Composite logos AFTER video gen (motion warps logos) or keep motion subtle.
- FLUX.2 [pro] reference images: max **8 (BFL direct) / 9 (fal)** — not 10. `safety_tolerance` range **1-5 on fal** (default 2, keep it).
- No SynthID watermark on FLUX (Gemini images carry SynthID → Meta "AI info" label risk → that's why Gemini is fallback).
- One fal.ai account: queue API + webhooks → fits Inngest. **fal URLs are short-lived — persist to Supabase `media` bucket immediately.** fal bills only successful generations.
- Satori constraints: flexbox only (no grid, no z-index, no calc()), TTF/OTF/WOFF fonts only (no WOFF2), CSS variables WITH fallback values OK, rasterize via resvg before IG/FB publish.
- Cost guardrails: cap **~60 generated video seconds/user/week**, default **2 Reels/week/user**; total media ≈ $5-9/user/mo ≈ 5-9% of ARPU.
- **Dead ends — do not use:** Sora API (EOL 2026-09-24), Kling official API ($4,200 prepaid min), Midjourney (no public API).

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

- `falClient.ts` — queue submit + webhook/poll helper (one API key, `FAL_API_KEY`).
- `satoriTemplates/` — 6-8 branded JSX templates (quote card, tip list, promo/offer, announcement, before/after, carousel slide set) with brand colors as CSS vars + tasteful no-branding fallback palettes; `satoriRender.ts` (Satori → resvg → PNG → Supabase).
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
  4. `media` — parallel steps via `mediaPlan.ts` (fal queue + step polling or webhook→event).
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
| **E2** | Media pipeline | L | falClient · Satori template system + raster + no-brand fallback · FLUX.2 adapter (+Gemini flag) · Seedance i2v adapter (+Veo flag) · styleKit · mediaPlan + degradation + Supabase persistence |
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

## 7. Standing project rules (from CLAUDE.md + memory — apply everywhere)

- Never mention AI providers user-facing; never the word "AI" in product UX copy.
- Anthropic generateObject: no minItems/maxItems on Zod arrays — trim in code.
- Zernio is "Late" in code; `day_of_week` 0=Monday; media types image/video/gif/document; immediate posts need `publishNow:true`.
- Prisma 7 adapter-pg only; routes thin → services; no barrel imports; Server Components default; `useApi` for client fetching.
- Never test by posting on real user accounts.
- New env vars to document in `docs/environment.md`: `FAL_API_KEY`, `RESEND_API_KEY` (exists?), `GEMINI_API_KEY` (fallback), autopilot action-token secret.
