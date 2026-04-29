# Account Insights & Post Suggestions

Powers account analysis + the "Get ideas" feature. Every field is labelled by source (real Zernio / code-derived / Claude-inferred).

## Pipeline

```
First connect (Inngest analyzeAccount):
  account/connected →
    compute-insights (source: external)
    if syncTriggered: sleep 60s → compute-insights-after-sync   (max 2 calls, no loop)
    mark-analysis-completed   ← flips as soon as insights are saved

Reconnect / backfill (Inngest refreshInsights):
  account/refresh-insights →
    compute-insights (source: all)
    mark-analysis-completed (idempotent: pending → completed)
                             ← suggestions are NOT touched

User chats in /d (chat tool `generate_posts`, calls createFromBrief synchronously):
  reads cached insights as-is (no inline refresh)
  createFromBrief() → wipe-and-replace drafts on the targeted accounts
```

**Core principle:** `createFromBrief()` runs only on user-visible actions (the chat tool inside `/api/chat`) — never in Inngest. Suggestion IDs stay stable until the user themselves triggers a new generation.

## Service responsibilities

| Service | Owns |
|---|---|
| `zernioContext.ts` | Per-platform Zernio fetcher: account, posts, analytics, best-times, posting frequency, followers. Handles 402 / 403 gracefully. |
| `accountInsights.ts` | `computeInsights` writes `insights` + `lastAnalyzedAt` only — does NOT touch `analysisStatus`. Cross-platform voice borrowing for cold-start. Returns `null` if account no longer exists. |
| `createFromBrief.ts` | `createFromBrief` reads cached insights as-is, asks Claude for posts shaped to the user's brief, wipes existing drafts and persists the new batch under a per-account advisory lock. |

Both `computeInsights` and `createFromBrief` exit cleanly on a missing SocialAccount (null guard) — avoids retry loops on stale events.

## Insights v2 schema (three zones)

`SocialAccount.insights` is JSON validated by Zod (`src/lib/schemas/insights.ts`). Three zones make data provenance explicit:

| Zone | Source | Examples |
|---|---|---|
| `zernio` | Real Zernio API | `followersCount`, `growth30d`, `topPosts[].metrics`, `bestTimes`, `postingFrequency` |
| `computed` | Code-derived from Zernio | `extractedHashtags` (regex), `voiceStats` (length / emoji % / `?` / links), `contentMix`, `primaryMetric` |
| `inferred` | Claude inference (nullable) | `topics`, `toneSummary`, `performingPatterns`, `confidence` |

`meta`: `version: 2`, `dataQuality` (`rich` / `thin` / `cold_start` / `platform_no_history`), `analyzedAt`, `postsAnalyzed`, `syncTriggered`, `nextRefreshAt`, `voiceBorrowedFromPlatform`.

## Per-platform config (`src/lib/insights/platformConfig.ts`)

| Platform | `primaryMetric` | `noExternalHistory` | `charLimit` | Notes |
|---|---|---|---|---|
| Instagram, Facebook, Twitter, Threads | `likes` | false | 2200 / null / 280 / 500 | Standard engagement |
| TikTok, YouTube | **`views`** | false | 2200 / null | Video — rank by views |
| Pinterest | **`saves`** | false | 500 | Save = success |
| LinkedIn | `likes` | **true** | 3000 | Personal accounts: only Zernio-published posts visible. Skip post fetch on `source: "external"`, fetch on `source: "all"`. |
| Bluesky | `likes` | **true** (no analytics) | 300 | `supportsAnalytics: false` |

`defaultBestTimes` per platform used when `bestTimes` is null (cold-start). `dayOfWeek` is **0=Monday** (matches Zernio).

## Cross-platform voice borrowing

When a platform is cold-start (LinkedIn personal first scan, Bluesky, or any account with 0 posts), `accountInsights` looks at the user's other `SocialAccount`s under the same `LateProfile` for one with `dataQuality: "rich"`. If found, it borrows the `inferred` zone (topics, tone, patterns) but forces `confidence: "low"` and sets `meta.voiceBorrowedFromPlatform`.

## Inngest functions (`src/inngest/functions/analyze-account.ts`)

| Function | Trigger | Steps |
|---|---|---|
| `analyze-account` | `account/connected` | compute-insights → (if syncTriggered) sleep 60s + compute-insights-after-sync → mark-analysis-completed (retries: 3) |
| `refresh-insights` | `account/refresh-insights` | compute-insights (`source: all`) → mark-analysis-completed (retries: 2) |

`analysisStatus` flips `analyzing` → `completed` as soon as insights are saved. `refreshInsights` is idempotent (`completed` → `completed`, `pending` → `completed`).

## Anthropic gotcha (re-stated — bites here most)

**`generateObject` rejects `minItems` and `maxItems` on Zod arrays.** Trim/validate in code instead. Pattern: define two schemas — Claude-safe (no constraints) + internal validation. See `inferredZoneClaudeSchema` vs `inferredZoneSchema`.

## Debug logging

Grep-friendly prefixes: `[zernio:raw]`, `[zernioContext]`, `[insights:claude:prompt]`, `[insights:claude:output]`, `[insights:final]`, `[suggestions:cache]`, `[suggestions:claude:prompt]`, `[suggestions:claude:output]`, `[accounts] 🔄 reconnect detected`, `[Zernio Webhook]`, `[analyze-account]`.

```bash
npm run dev | grep -E "\[zernio|\[insights|\[suggestions"
```
