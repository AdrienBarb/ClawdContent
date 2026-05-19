# PostClaw Pivot Plan — 2026-05-18

Companion to `postclaw-audit-2026-05-18.md`. This is the implementation plan, not the audit. Phases 1, 2, 3. Phase 4 (distribution) deferred.

---

## 0. Data findings (the basis for narrowing decisions)

Pulled from prod (`ideqdufwcrwbjqzcctsf`) on 2026-05-18:

**Funnel state (all-time):**
- 258 total signups
- 213 onboarded (82%)
- 36 with at least one connected social account (17% of onboarded — the biggest leak in the funnel, not the publish wall)
- 0 published posts across all 36 connected users, all 10 platforms

**Platform connect distribution (36 connected users, 60 connections total):**

| platform | users | drafts | drafts/user |
|---|---|---|---|
| **Instagram** | **21 (58%)** | 61 | 2.9 |
| **Facebook** | **11 (31%)** | 29 | 2.6 |
| Twitter/X | 8 | 15 | 1.9 |
| TikTok | 8 | 25 | 3.1 |
| LinkedIn | 7 | 27 | 3.9 |
| Threads | 5 | 11 | 2.2 |
| Reddit | 3 | 0 | 0 |
| YouTube | 2 | 18 | 9.0 |
| Pinterest | 1 | 3 | 3.0 |
| Bluesky | 1 | 3 | 3.0 |

**Platforms-per-user distribution:**
- 1 platform only: 21 users (58%)
- 2 platforms: 7 users (19%)
- 3 platforms: 5 users (14%)
- 4 platforms: 2 users (6%)
- 9 platforms: 1 user (3%) — internal/test account

### What the data tells us

1. **Instagram is universal.** Every connected user has connected Instagram (21/21 in connects, 100%). It is non-negotiable for the default flow.
2. **Facebook is the natural #2.** 31% pickup. All Facebook-connected users almost certainly also have Instagram (FB ≤ IG in counts).
3. **58% only connect one platform.** "9 platforms" is founder bait — real users pick one and stop.
4. **LinkedIn has high per-user engagement (3.9 drafts/account)** but small base. This is the founder/creator segment we're firing. Confirms the audit.
5. **Reddit appears in the data (3 users) but isn't in `src/lib/constants/platforms.tsx`.** Old Zernio API drift. Flag to clean up.
6. **The real leak is connect, not publish.** 213 onboarded → 36 connected = 83% of onboarded users never reach the publish step. Narrowing the platform picker fixes this leak.

### Decision: platform narrowing for v2

- **Default visible:** Instagram only, pre-selected.
- **Inline secondary:** "Also connect Facebook" toggle next to it.
- **Hidden behind "More platforms" disclosure:** Twitter/X, TikTok, LinkedIn, Threads, YouTube, Pinterest, Bluesky.
- v1 users see the current 9-platform grid unchanged.

---

## 1. Decisions confirmed from today's session

- **v1/v2 versioning.** Existing prod users flagged `version="v1"`, keep current `/d` experience untouched (chat composer + drafts board + manual publish). All new signups from cutover date forward are `version="v2"` with auto-publish-by-default.
- **Auto-publish for v2 only.** Backend, UX, and pricing all v2-scoped.
- **Onboarding goal selection.** New step in v2 onboarding. Goal drives generation strategy (content mix, CTA style, hashtag pattern, frequency).
- **Weekly performance learning loop.** Analytics from Zernio fed back into next week's generation prompt. Apply, test, iterate.
- **Per-social-account pricing.** Replaces $49 flat for v2. v1 users grandfathered on $49.
- **Phases 1, 2, 3. Skip Phase 4 (distribution loops).**

---

## 2. What you might be forgetting (the meta-question)

I went deep on this. Ranked by what's most likely to bite us.

### 🔴 High risk — silent killers

**a. The first-post trust moment.** The first auto-published post is the moment of truth. If a user wakes up Tuesday and sees a bad post on their Instagram, they churn instantly and tell their friends. Mitigation options: (1) require explicit "Start posting" click on the first batch preview; first 5 posts are pre-approved as a batch, then steady-state auto-publish; (2) email/SMS notification 30 min before each of the first 3 posts ships with a "cancel" link; (3) "shadow mode" first week — generate posts to the queue, but require user click for first 3 posts before fully going hands-off. **My recommendation: option 1 (preview-batch approval) for first 5 posts. After post #6, fully hands-off.**

**b. Cancel-window UX must be multi-surface.** Users don't sit in your app. A 2h cancel window only exists if they know about it. Required surfaces: (1) in-app at /d (calendar/list view), (2) email "Tuesday 10am post ships in 2h — cancel link", (3) browser push notification (optional), (4) weekly digest summary "here's everything we shipped this week." Without notifications, the cancel window is theater. **The audit was light on this — this is product-defining UX.**

**c. Brand voice calibration.** Generation quality is the single point of failure. Even if the pipeline works, bad-sounding posts = churn. Need: per-post feedback button ("sounds like me / not me") that feeds back into the prompt, and a "writing samples" upload during onboarding (paste 2-3 of your real posts so the model learns voice). Without this, every user gets PostClaw-flavored AI prose, not their own voice.

**d. Failure modes & retries.** Zernio could be down. Instagram could reject a post (banned hashtag). Account could disconnect mid-week. Today there's zero retry logic in `publishOrScheduleSuggestion`. Auto-publish makes silent failures catastrophic — user thinks we're posting, we're not, they churn 4 weeks later when they notice. Need: (1) 3-attempt retry with exponential backoff, (2) "post failed, here's why" surface in /d, (3) email alert on disconnect, (4) auto-pause queue on disconnected account.

**e. Media/images.** Instagram performance dies without images. The audit completely missed this. Three options: (1) auto-generate images via DALL-E 3 / Flux per post using the existing AI stack, (2) scrape brand assets from user's website during Firecrawl onboarding into a per-user library, (3) require user upload of a starter pack at onboarding. **Real answer is all three: scrape what we can from their site, fill gaps with generated, let user upload their own to override.** Without images, auto-publish on Instagram will perform at 5-10% of human-curated. This is non-optional.

### 🟡 Medium risk — product debt waiting to happen

**f. Regulated industries opt-out.** Cambridge Heartwear is medtech. Posting AI-generated medical claims auto-publish is a legal landmine. During KB extraction, detect regulated industries (medical, financial, legal, supplements, kids) and force-flip those users into review-first mode. Surface as: "We noticed you're in healthcare. We'll prep posts but require your approval before each one ships."

**g. Posting frequency defaults + vacation mode.** How often per platform per week? Frequency should be: a sensible default from the goal (e.g. "Get customers" = 3x/week Instagram, "Look professional" = 2x/week), user-adjustable, and pausable in one click for vacation/off-season.

**h. Content pillars / variety.** If we generate forever without structure, posts become repetitive ("Welcome to [business]! We're so glad you're here.") Need 3-5 content pillars per business derived from KB at onboarding (e.g. for a caterer: menus, behind-the-scenes, events, testimonials, seasonal). Generation rotates pillars so weeks don't all look the same. Without this, week-3 retention dies.

**i. Multi-platform variants.** Same idea, different per-platform copy. Instagram = long + hashtags. X = short + punchy. LinkedIn = pro tone. Today `createFromBrief` outputs platform-aware copy already — verify and document.

**j. Empty queue prevention.** System must always be 2 weeks ahead. If queue runs low or user cancels heavily, auto-regenerate. Never let a v2 user see "no posts queued" — that's the moment they remember they could be doing this themselves.

**k. User-supplied context per cycle.** Weekly chat prompt or simple form: "anything happening this week we should post about?" (sale, event, new product, conference). Drives one post per week from user input + 2-4 from auto-generation. Keeps the system relevant without requiring full manual mode.

### 🟢 Lower risk but easy to forget

**l. Weekly digest email.** Auto-publish without visibility = invisible value = churn. Send Monday: "Last week we posted N times for you. Best performer: X. Coming this week: Y, Z, W. [Open dashboard]." Makes the magic visible without forcing them into the app.

**m. v1 → v2 migration banner.** Existing $49/mo users get an opt-in: "Want us to just post for you? Switch to v2." Voluntary. Track migration rate as leading indicator of product-market fit on the new flow.

**n. Stripe migration complexity.** Moving from $49 flat to per-account quantity billing isn't a copy change. New Stripe product/price for v2 plan, handle proration, sync `accountsIncluded` ↔ Stripe quantity. The existing `legacy starter/business → pro` shim shows we already have legacy billing debt — Phase 3 adds to it.

**o. Internal admin dashboard.** A simple `/admin` page (you-only) showing per-user: queue size, cancel rate, last-post-date, retention status, v1/v2 split. Without this, you can't debug at scale and you can't track if Phase 3 is actually working.

**p. Re-onboarding when knowledgeBase becomes stale.** Businesses change. Quarterly re-prompt: "anything new about your business since [date]?" Or on retention-drop signal: "we noticed engagement dropped, want to update your profile?"

**q. Reddit drift in data vs platforms.tsx.** 3 users connected Reddit but it's not in our platform constants. Means somewhere there's an older Zernio integration path. Decide: add Reddit officially, or remove the orphan accounts. Probably remove.

**r. Time-of-day learning.** Per-account, per-day-of-week — learn from real Zernio post analytics after 4 weeks of data. Don't hard-code "best times" forever. This is part of the weekly analysis loop.

---

## 3. Open decisions — need your call before relevant phase

Listed in order they'll block work. (1) and (2) block Phase 1. (3)–(7) block Phase 3.

1. **Redirect or delete `/for-creators` + `/for-founders`?** I recommend 301-redirect to `/`. Preserves any backlinks, kills the segmentation.
2. **Reddit: re-add to platforms.tsx, or remove the 3 orphan accounts?** Recommend remove — only 3 users, 0 drafts, not in our supported list per CLAUDE.md.
3. **Cancel-window architecture: A (PostClaw holds 2h, then hands to Zernio) or B (Zernio holds, delete on cancel)?** I recommend A. We own the trust contract; Zernio delete-scheduled support is unverified.
4. **First-batch UX: preview-batch approval (training wheels) or full hands-off from day 1?** I strongly recommend preview-batch for the first 5 posts. After that, full auto.
5. **Pricing per account: what exact shape?** Options: (a) flat $19/account/mo, (b) $25 first account + $10/each additional, (c) tiered $29 base (1 account) / $49 (3 accounts) / $79 (unlimited up to 9). Picking one before I start Stripe work. I lean (a) — simple, scales linearly, easy to grok. 7-day free trial on first account.
6. **Migration trigger for v1 → v2:** voluntary banner only, or also force on next billing renewal? Recommend voluntary only — don't break paying users.
7. **Image strategy for v2 launch:** auto-generated (DALL-E 3 / Flux), scraped from website during Firecrawl, user-uploaded asset library, or all three? Recommend ship v2 with scraped + auto-generated. User upload comes in v2.1.

---

## 4. The plan

### Phase 1 — Foundation + cheap kills (target: 1 week)

Independent of all big decisions except (1) and (2). Can start immediately.

**1.1 Schema foundation**
- Add `User.version: String` (default `"v1"`). Backfill all existing users to `"v1"` in the migration.
- Add `User.goal: String?` (nullable for v1, required at v2 onboarding completion).
- Add `User.regulatedIndustry: Boolean @default(false)` (set during KB extraction if industry matches medical/legal/financial/etc.).
- Migration: `prisma migrate dev --name add_user_version_goal`.
- Update all signup paths to set `version="v2"` for new users from cutover date.

**1.2 Copy fixes (applies to both v1 and v2 — it's marketing)**
- Fix error message rule violations: `src/lib/constants/errorMessage.ts:15-16`.
- Rewrite Hero H1: "We run your Instagram and Facebook. No dashboard. No drafts to review."
- Update: `manifest.ts`, `for-small-businesses/page.tsx`, `affiliates/page.tsx`, `alternatives/page.tsx`, `alternatives/[slug]/page.tsx`, `blog/page.tsx`, `blog/[slug]/page.tsx`, `PainSection.tsx`, `BillingUnsubscribed.tsx`, `SubscribeModal.tsx`.
- Leave `createFromBrief.ts:202` (LLM system prompt) and legal pages unchanged.

**1.3 Kill the "Who it's for" three-segment section**
- Remove `<WhoIsThisForSection />` from `src/app/(home)/page.tsx:138`.
- Delete `src/components/sections/WhoIsThisForSection.tsx`.
- 301-redirect `/for-creators` and `/for-founders` → `/` (pending decision #1).
- Keep and rebrand `/for-small-businesses` as the primary segment page.

**1.4 Platform picker narrowing (v2 only)**
- Add `platformIds?: string[]` and `showMoreToggle?: boolean` props to `src/components/dashboard/ConnectAccountButtons.tsx`.
- In `EmptyDashboardState.tsx:39`, pass `platformIds={["instagram", "facebook"]}, showMoreToggle={true}` when user is v2.
- v1 users on accounts page see the existing 9-platform grid unchanged.
- "More platforms" toggle reveals the other 7 (Twitter/X, TikTok, LinkedIn, Threads, YouTube, Pinterest, Bluesky) for v2 users who explicitly want them.
- Reddit: remove orphan accounts in same migration as 1.1 (pending decision #2).

**1.5 Update CLAUDE.md**
- Root: clarify v1/v2 split and platform picker rules.
- `src/lib/services/CLAUDE.md`: note that auto-generation in Inngest is allowed for v2 (changed from "never").
- Root: fix stale "exactly five tools" — there are 7 chat tools.

**Exit criteria for Phase 1:**
- All copy says "we post for you" not "AI manager".
- New signups land as `version="v2"`.
- Existing users untouched, still see /d with chat composer.
- v2 onboarding still works end-to-end (just lands them on the old /d for now — Phase 2 fixes that).
- No paying users broken.

---

### Phase 2 — v2 onboarding rewrite (target: 1-2 weeks)

Blocks: decisions #1, #2 from Phase 1. Decision #4 (first-batch UX) decided here.

**2.1 Add goal selection step to onboarding (v2 only)**
- New step in `src/app/(onboarding)/onboarding/page.tsx`: after KB validation, ask "What's your goal?"
- Options:
  - "Get more local customers" (default for local services)
  - "Sell more products online" (e-commerce signal)
  - "Build an audience for my brand" (creator/founder — show warning "PostClaw is built for SMBs, you may prefer Buffer")
  - "Stay top-of-mind with existing clients" (B2B/agencies)
  - "Look professional and active" (default catch-all)
- Each option maps to a generation strategy stored as JSON config in `src/lib/services/goalStrategies.ts` (new file). Strategies define:
  - Content pillar weights
  - CTA style
  - Hashtag pattern
  - Posting frequency default
  - Time-of-day defaults

**2.2 Detect regulated industries during KB extraction**
- In `src/lib/services/extractKnowledgeBase.ts` (or wherever the Anthropic call lives), add an output field `industryCategory` with classifier output.
- If category is `medical | legal | financial | supplements | kids | regulated_other`, set `User.regulatedIndustry = true`.
- This flag forces review-first mode in Phase 3 regardless of version.

**2.3 Inline platform connect in onboarding (v2)**
- After goal selection, show the narrowed platform picker (Instagram default).
- User connects → fires existing Zernio callback → fires `account/connected` Inngest event.
- Wait state: "Setting up your first week of posts..." with a loading shell.

**2.4 First-batch preview screen**
- After `account/connected` fires the new auto-generate path (Phase 3 wiring), show user a `<FirstBatchPreview>` component (new file `src/components/dashboard/FirstBatchPreview.tsx`).
- Layout: 5 cards (one per generated post), each with: day/time, platform, copy preview, optional generated image, "Looks good" / "Regenerate" / "Edit" actions.
- Bottom CTA: "Start posting for me" → flips user state from `firstBatchApproved=false` to `true`, queues all 5 with cancel windows.
- If user clicks "Regenerate" on individual posts, those get re-prompted with feedback.
- This is the training-wheels gate (decision #4 = option preview-batch).

**2.5 Brand voice samples capture**
- Optional step (skip allowed) between goal and platform connect: "Paste 2-3 of your past posts so we learn your voice."
- Stored in `User.voiceSamples: Json[]`.
- Fed into `createFromBrief` prompt as system-prompt context.

**2.6 New /d branching for v2**
- `src/components/dashboard/PublishPage.tsx`: add a third branch.
  - `version === "v1"` → current chat + drafts board (unchanged).
  - `version === "v2" && !firstBatchApproved` → first-batch preview (`<FirstBatchPreview>`).
  - `version === "v2" && firstBatchApproved` → calendar view + cancel buttons (`<AutoPublishDashboard>`, new component).

**Exit criteria for Phase 2:**
- New v2 user can: signup → set goal → connect Instagram → see 5 generated posts → click "Start" → land on a queue calendar.
- v1 path untouched.
- Auto-publish backend is still mocked: queue exists but actual scheduled-publish-via-Inngest doesn't fire yet (Phase 3).

---

### Phase 3 — Auto-publish + analytics + pricing (target: 2-3 weeks)

The architectural inversion. Blocks: decisions #3, #5, #6, #7.

**3.1 Schema: invert "row exists = draft"**
- Add to `PostSuggestion`:
  - `status: String @default("draft")` — values: `draft | queued | live | cancelled | failed`
  - `queuedAt: DateTime?`
  - `publishAt: DateTime?`
  - `cancelDeadline: DateTime?`
  - `zernioPostId: String?`
  - `failureReason: String?`
  - `performance: Json?` (impressions, likes, comments, engagement rate — populated by weekly analytics)
- Migration `add_postsuggestion_status_lifecycle`. All existing rows backfill to `status="draft"`.
- Update `publishOrScheduleSuggestion` (in `src/lib/services/publishSuggestion.ts`) to no longer delete on success — instead flip status to `live` and store `zernioPostId`.

**3.2 Inngest: auto-queue on `account/connected` (v2 only)**
- Extend `src/inngest/functions/analyze-account.ts`.
- After `mark-analysis-completed`, if `user.version === "v2" && !user.firstBatchApproved`:
  - Step `auto-generate-first-batch`: calls `createFromBrief` with goal-aware prompt → writes 5 `PostSuggestion` rows with `status="draft"`.
  - Image generation step (decision #7): for each draft, kick off image generation (scraped or generated).
  - Hold there. The preview-batch approval (Phase 2.4) is what flips them to `queued`.

**3.3 Inngest: cancel-window-cutover (new function)**
- New file: `src/inngest/functions/auto-publish-cutover.ts`.
- Trigger: event `post/auto-publish` with `ts = cancelDeadline`.
- Re-reads `PostSuggestion`. If `status === "queued"`, calls `publishOrScheduleSuggestion(id, "publish")`. If `status === "cancelled"`, no-op.
- Decision #3 = option A: PostClaw holds the 2h, hands to Zernio at cutoff.

**3.4 Inngest: weekly-regenerate (per v2 user)**
- New cron-based Inngest function. Runs Sunday night per user.
- Checks queue: if fewer than 7 days of scheduled posts ahead, regenerate next batch.
- Uses last week's performance (3.5) as input to the generation prompt: "These posts performed best, generate more like them. These performed worst, avoid that pattern."

**3.5 Inngest: weekly-performance-analytics (per v2 user)**
- New cron Inngest function. Runs Monday morning per user.
- Calls Zernio analytics API for each post published in the last 7 days.
- Populates `PostSuggestion.performance` JSON.
- Computes per-user weekly stats: total impressions, avg engagement rate, top/bottom posts.
- Stores in new `WeeklyReport` table for the digest email and learning loop.

**3.6 PostCard / calendar UX (v2)**
- New component `src/components/dashboard/AutoPublishDashboard.tsx`.
- Calendar view (week + month toggle) with posts pinned to their `publishAt`.
- Each post card:
  - `status="queued"` & inside cancel window → "Cancel (1h 47m left)" with countdown
  - `status="queued"` & outside cancel window (publishAt > cancelDeadline) → "Scheduled for [time], past the cancel window — contact support to abort"
  - `status="live"` → "Posted [time]" with link to platform post + performance stats once available
  - `status="cancelled"` → "Cancelled" with "Restore as draft" option
  - `status="failed"` → "Failed: [reason]" with retry button
- Bulk actions: "Pause all queued posts for vacation" → flips all `queued` → `paused` (new status, doesn't fire cutover).

**3.7 Notifications (cancel window must be multi-surface)**
- New service `src/lib/services/notifications.ts`.
- Email: 2h before `publishAt`, send "Your [day] post ships at [time] — cancel link." Use existing Brevo integration (`src/lib/brevo/`).
- Email: weekly digest Monday morning. "Last week N posts shipped. Best: X. Engagement: Y%. Coming up this week: A, B, C."
- Email: on `status="failed"`, alert user.
- Browser push: optional (deferred to v2.1).
- In-app: persistent banner if any post is in `cancel-window-open` state.

**3.8 Pricing: per-social-account (v2)**
- Decision #5 = my recommendation (a): flat $19/account/mo, 7-day free trial on first account.
- New Stripe product `pro_per_account` with quantity-based pricing.
- Update `src/lib/services/subscription.ts` (or equivalent) to compute quantity from `socialAccount` count for v2 users.
- Webhook handling in `src/app/api/webhooks/stripe/route.ts`: on connect/disconnect of social account, update Stripe quantity.
- v1 users locked into legacy $49/mo until they opt to migrate.
- Migration banner in `/d` for v1: "Switch to v2 with auto-posting? [Compare] [Switch now]."

**3.9 Failure modes + retries**
- In `publishOrScheduleSuggestion`, wrap Zernio `createPost` call in retry-with-backoff (3 attempts, 30s/2min/10min).
- On final failure: set `status="failed"`, store `failureReason`, fire email, surface in UI.
- On account disconnect (via existing webhook): flip all `queued` posts for that account to `paused` and email user.

**3.10 Brand voice feedback loop**
- "Sounds like me / not me" thumbs on every post card.
- Negative feedback re-prompts generation with the offending post as anti-example.
- Aggregate per-user voice patterns into `User.voiceSamples` over time.

**3.11 Admin dashboard (you-only)**
- New route `src/app/(admin)/admin/page.tsx` gated by your user ID.
- Per-user table: version, queue size, cancel rate (last 14d), last-post-date, D14 retention, MRR.
- Aggregate: v1 vs v2 counts, v2 first-batch approval rate, v2 cancel rate, v2 → paid conversion.

**Exit criteria for Phase 3:**
- New v2 user signs up → onboards → connects → approves first batch → posts auto-ship for the next 4 weeks without user intervention except cancellations.
- Weekly digest email goes out Monday morning.
- Performance analytics populate within 24h of each post.
- v1 users completely unchanged.
- v2 user can cancel any queued post within 2h of `publishAt`.
- Stripe charges per-account for v2 users.
- Internal admin dashboard shows v1/v2 split, cancel rates, retention.

---

## 5. Cutover sequencing

How I'd actually merge these:

1. **PR 1 (Phase 1.1 — schema only):** Add `version`, `goal`, `regulatedIndustry` columns. Backfill v1. No user-facing change.
2. **PR 2 (Phase 1.2-1.5 — copy + kill + picker):** All the cheap kills. Ship behind no flag. v1 users see no functional change, just better copy.
3. **PR 3 (Phase 2.1-2.5 — onboarding rewrite):** v2-only. Branched on `user.version`. v1 onboarding still works (existing prod users won't re-onboard anyway).
4. **PR 4 (Phase 2.6 — /d branching):** v2 lands on first-batch preview. Auto-publish backend still mocked — preview just generates and waits.
5. **PR 5 (Phase 3.1-3.3 — schema + cutover function):** Auto-publish backend behind flag `AUTO_PUBLISH_ENABLED=false` initially.
6. **PR 6 (Phase 3.4-3.7 — analytics + notifications + UX):** Ship calendar, cancel UI, weekly digest. Still flagged.
7. **PR 7 (Phase 3.8-3.9 — Stripe + retries):** Per-account billing. Flagged.
8. **PR 8 (Phase 3.10-3.11 — voice feedback + admin):** Polish.
9. **Cutover:** flip `AUTO_PUBLISH_ENABLED=true`. Monitor admin dashboard hourly for first 48h. Manually verify first 3 v2 users have shipped at least 1 post.

---

## 6. Metrics to watch by phase

- **Phase 1:** No regressions. v1 cohort retention stable. v2 signup count grows.
- **Phase 2:** v2 onboarded → v2 connected (target: 50%+, vs 17% current baseline). v2 connected → v2 first-batch-approved (target: 80%+).
- **Phase 3:** v2 first-batch-approved → first publish (target: 95%+, since it's automated). v2 first publish → 4 published posts (target: 80%+ retention). v2 → paid conversion (target: 5-10% in first 14 days). Cancel rate per post (red flag if >30%, signals bad content).

---

## 7. Risks I'm betting we accept

- **Auto-publish bug ships a bad post to a real account.** Mitigation: preview-batch approval + 2h cancel window + retry + admin alerts. Risk remains > 0.
- **Goal-to-strategy mapping is shallow at v2.0.** Will need iteration. Acceptable since the alternative is 0% publish today.
- **v1 users feel abandoned as we focus on v2.** Mitigation: migration banner + grandfathered pricing. They got what they signed up for.
- **Image generation cost.** If we auto-generate per post via DALL-E 3, it's ~$0.04/image × ~15 posts/user/month = $0.60/user/month. Margin is fine at $19/account/mo.
- **Stripe migration is the most fragile part.** Mitigation: full test in staging, run v1 and v2 plans in parallel, never auto-migrate.

---

## Decisions for you to call now (so I can start Phase 1)

Need before Phase 1:
1. Redirect or delete `/for-creators` + `/for-founders`?
2. Reddit: remove orphan accounts?

Need before Phase 2 (1-2 weeks out, can decide later):
4. First-batch UX = preview-batch approval (my rec) or full hands-off?

Need before Phase 3 (3-4 weeks out, can decide later):
3. Cancel-window architecture A or B?
5. Pricing: flat $19/account, tiered, or hybrid?
6. v1 → v2 migration: voluntary banner only?
7. Image strategy: scraped + generated + uploaded?

Confirm decisions, I'll start PR 1.
