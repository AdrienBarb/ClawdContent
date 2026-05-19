# PostClaw MVP — ship tonight

> **Implementation status — 2026-05-19**
> Branch: `feat/postclaw-mvp-pivot`. Local Supabase initialized (port 54422). All migrations applied. See per-task status markers below: ✅ done · 🟡 partial/changed · ❌ not done · 🔁 reverted.

Goal: prove someone will pay $19/mo for autopublish. That's it.

## The cut

Yes:
- Full onboarding (existing 2-step + Instagram connect inline)
- Social media analysis (reuse existing `analyze-account` Inngest, feed insights into generation)
- Auto-generation of 5 posts after connect
- Batch-approve "Schedule all 5" button
- Posts go to Zernio with scheduledAt spread over next 7 days
- Paywall after the 5 free posts: $19/mo per IG account, 7-day trial

No (deferred to v2.1+):
- 2h cancel window after schedule (Zernio is final once handed off)
- Voice samples upload, goal selection, regulated industry detection
- Image generation / scraping (text-only at launch)
- Weekly digest emails
- Performance analytics loop
- Admin dashboard
- Multi-platform variants beyond Instagram + Facebook
- Failure-mode retries
- Per-post voice feedback thumbs
- Calendar view (simple list is enough)

## Current users — what we do

Nothing. They keep the current `/d` experience exactly as today.

Mechanism: add `User.version` column. Existing users backfilled to `"v1"`. New signups from cutover get `"v2"`. Only v2 sees the new flow. If MVP validates, add a "Switch to autopublish" banner in v1 later. If not, no v1 user notices anything.

## The new v2 user flow

```
signup
  ↓
onboarding step 1: business URL or description (existing)
  ↓
onboarding step 2: validate extracted KB (existing)
  ↓
onboarding step 3 (NEW): connect Instagram (Facebook optional toggle)
  ↓
landing /d → loading state "We're learning your account and writing your first week..."
  ↓ [Inngest: analyze-account → createFromBrief → 5 drafts with scheduledAt spread over 7d]
  ↓
"Here's your first week. Schedule all?" → 5 cards + per-card skip toggle + big "Schedule" button
  ↓ [on click: existing publishOrScheduleSuggestion(schedule) per approved draft]
  ↓
"You're set. Next post: Tuesday 10am. We'll keep going from here."
  ↓
[paywall after 5th free schedule: Stripe checkout $19/mo per IG account, 7-day trial]
```

## Task list

Tracked via TaskCreate. Each task is a discrete commit.

1. ✅ **Schema migration** — Add `User.version` (default `"v1"`), `User.firstBatchApproved` (default `true` for existing, `false` for new v2). Set `version="v2"` for new signups in Better Auth hook.
   - Migration `20260518120000_add_user_version_and_first_batch_approved` applied. Hook at `src/lib/better-auth/auth.ts:97-104`.

2. ✅ **Copy kills** — Rewrite Hero H1, fix `errorMessage.ts` violations, replace "AI social media manager" in marketing pages. Kill `<WhoIsThisForSection />`. 301 `/for-creators` + `/for-founders` to `/`.
   - All AI-branding + "9 platforms" strings rewritten across 10 files. `WhoIsThisForSection.tsx` deleted, removed from `(home)/page.tsx`. `/for-creators` + `/for-founders` page files deleted, 301 redirects added in `next.config.ts`. Footer trimmed. Hero kept as-is — already matched the new positioning.

3. 🟡 **Platform picker narrowing (v2 only)** — In `EmptyDashboardState`, show Instagram pre-selected + "Also Facebook" toggle. "More platforms" disclosure below for the other 7. v1 unchanged.
   - **Diverged.** Added `platformFilter?: string[]` prop to `ConnectAccountButtons` and narrowed only inside the new onboarding step 3 (IG + FB visible). `EmptyDashboardState` still shows all 9 with no highlighting.
   - **Why:** the original spec contradicted CLAUDE.md / saved feedback ("never highlight or reorder platforms in the connect UI"). Kept the connect-UI rule, narrowed only in the v2-only onboarding step where it's safe.

4. ✅ **Onboarding step 3 — inline connect** — After KB confirm, push v2 users to a new connect step instead of `/d`. Use existing `ConnectAccountButtons` with the narrowed picker.
   - `page.tsx` converted to RSC that reads `user.version`. New `OnboardingClient.tsx` adds the `"connect"` step with IG + FB + "I'll do it later" skip link.

5. ✅ **Inngest auto-generate** — Extend `analyze-account.ts`: after `mark-analysis-completed`, if `user.version==="v2" && !user.firstBatchApproved`, call `createFromBrief` with insights as context. Write 5 `PostSuggestion` rows with `scheduledAt` spread over the next 7 days (one per day, default 10am local time). Status stays as `draft`.
   - New `generateFirstBatchIfEligible()` step. `createFromBrief` extended with `count` + `scheduledAtList` params (per-account assignment).
   - **Bonus fixes from review:** atomic CAS lock via `User.lastSuggestionsGeneratedAt` prevents the IG+FB-connect race from generating 2× batches; timezone math rewritten with per-date offset + local-day anchoring (DST-correct, no past-dated first posts for east-of-UTC users).

6. ✅ **v2 pre-approval `/d`** — New branch in `PublishPage.tsx`: if v2 && drafts exist && `!firstBatchApproved`, show `<FirstBatchApproval />` — 5 cards with copy preview + scheduledAt + "skip" toggle, plus a "Schedule these N posts" button at the bottom.
   - `FirstBatchApproval.tsx` includes the loading state ("We're learning your account...") when drafts haven't materialized yet; polls every 5s until they arrive.

7. ✅ **Approve handler** — Server action that loops approved drafts and calls existing `publishOrScheduleSuggestion(id, "schedule")` for each. On success, set `user.firstBatchApproved = true`.
   - `/api/onboarding/approve-batch`. **Hardened from review:** tenant-scoped pre-filter (closes IDOR oracle), generic `failed` count instead of leaking per-ID error codes, only flips `firstBatchApproved=true` when `scheduled > 0 || skipped > 0` (no dead-end on full failure).

8. ❌ **v2 post-approval `/d`** — Simple "Coming up this week" list showing future scheduled posts (read from Zernio if needed, or keep PostSuggestion rows with `status="scheduled"` instead of deleting). Decision: easiest path is to keep the existing delete-on-schedule behavior and just show "Your first post ships [day]" until first one fires.
   - **Not done.** After approval, `firstBatchApproved` flips true and `/d` falls through to the existing `PublishShell` (chat + suggestions board). Existing delete-on-schedule behavior preserved, but the "Your first post ships [day]" hint was not added. Cosmetic gap.

9. 🔁 **Stripe paywall trigger** — For v2 users, after 5 scheduled posts (`User.postsPublished` counter, already exists), force `<SubscribeModal>`. Stripe checkout with new product `pro_per_account` at $19/account/mo, quantity = count of connected accounts, 7-day trial on first checkout.
   - **Implemented, then reverted per user request.** v2 users hit the same existing $49/mo single-plan paywall as v1 after 5 scheduled posts. The `pro_per_account` plan, env-var fallback, quantity logic, and V2PricingCard modal were all removed. `User.version` column remains so per-account pricing can be revisited later targeting just v2 users.

10. ❌ **Smoke test** — End-to-end: create fresh test user, run through v2 flow, verify 5 posts get scheduled in Zernio, verify Stripe checkout opens after.
    - **Pending** — needs manual walkthrough now that the local Supabase is up (port 54422). Local dev was blocked until the fresh DB was initialized today.

## Decisions baked in (no more asking)

- **v1 / v2 split via `User.version` column.** Yes.
- **Existing users:** untouched. v1 forever unless they opt to switch later.
- **Platform default for v2:** Instagram pre-selected, Facebook inline toggle, 7 others behind disclosure.
- **First batch UX:** batch-approve with skip per card. No autopublish-from-day-1. After first batch, we'll add weekly auto-regen in v2.1.
- **Scheduled posts go straight to Zernio (no 2h cancel window).** If users complain, add the holder later.
- **Pricing:** $19/account/mo, quantity-based, 7-day trial on first account.
- **Image generation:** none for MVP. Text-only first launch. Add scraping + generation if conversion validates and Instagram engagement tanks.
- **`/for-creators` + `/for-founders`:** 301 redirect to `/`.
- **Reddit orphan accounts:** ignore. Not worth a migration tonight.

## Stop conditions

If during build I hit:
- Stripe quantity-based pricing requires more than a 30-minute setup → ship with flat $19/mo, defer per-account to v2.1
- Inngest auto-generate hits the existing "never generate from Inngest" guardrail and breaks something → fall back to triggering generation from a route handler called by the client after onboarding
- The 5-draft schedule batch exceeds Zernio rate limits → schedule them one at a time with a 1-min Inngest gap

## Out of scope explicitly for tonight

No image gen. No voice samples. No goal selection. No cancel window. No weekly regen. No digest emails. No performance analytics. No admin dashboard. No multi-account billing complexity. No vacation mode. No content pillars. No regulated industry guard.

Each gets a one-line entry in `postclaw-pivot-plan.md` for v2.1 onwards.

---

## Deferred follow-ups from adversarial review (v2.1)

Surfaced during the multi-agent review but accepted as ship-tonight risks. Add to backlog:

- **FirstBatchApproval failure surface.** If Inngest generation fails permanently (after retries), `FirstBatchApproval` polls "We're learning your account..." forever with no escape. Needs a `firstBatchStatus` field on User or a client-side timeout with a "Skip onboarding batch" CTA.
- **Subscription quantity drift.** Stripe quantity for `pro_per_account` (if re-enabled) is read at checkout creation only. Disconnect/reconnect doesn't re-sync. Needs a `syncSubscriptionQuantity` helper called from `accounts.ts` + Stripe webhook.
- **`auth.ts` v2 flag ordering.** v2 flag update runs after `ensureUserProfile` but is independent — if profile creation failed (logged-not-thrown), version still flips. Consider folding the version write into `ensureUserProfile`.
- **Clean-code refactors.** Extract a `PrimaryCtaButton` + `PostCardShell` to stop the coral gradient + post-card anatomy from drifting across `FirstBatchApproval`, `SubscribeModal`, and `ResultsView`. Lift `approve-batch` business logic into `src/lib/services/firstBatch.ts` (thin-routes rule). Add a `USER_VERSION_V2` constant instead of repeating `"v2"` literal in 5 call sites.
- **DST edge case.** `getTimezoneOffsetMinutes` regex doesn't match plain `"GMT"` strings — falls through to 0. Partially mitigated by per-date offset in the F2 fix, but a proper tz library would be safer than the hand-rolled `Intl.DateTimeFormat` parsing.

---

## Environment / infrastructure notes from this session

- **Local Supabase initialized.** `supabase init` created the project config; ports shifted from default 543xx → 544xx to avoid clashing with the local `halo-collective` Supabase that was already using 54325. PostClaw DB now at `127.0.0.1:54422` (Studio at 54423).
- **`.env` updated** with new `DATABASE_URL` + `DIRECT_URL` pointing at port 54422. All Prisma migrations applied via `prisma migrate deploy`.
- **Branch.** All pivot changes live on `feat/postclaw-mvp-pivot` (off `main` @ `1760a56`). Nothing committed yet — review and stage before commit. `supabase/.temp/cli-latest` and the planning markdown docs at repo root are unstaged untracked; decide whether to gitignore them.
