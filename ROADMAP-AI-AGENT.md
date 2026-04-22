# PostClaw AI Agent — Roadmap

> From "content scheduler" to "AI social media manager"

## Current State (11 tools)

Post CRUD (create, list, update, delete, unpublish, retry), analytics (overview, daily metrics, best time), accounts (list), logs.

---

## Phase 1 — Strategy Adaptation (Priority)

Make the AI learn the user's brand, analyze what works, and adapt content strategy over time.

### 1.1 Brand Voice Memory

- Add `brandVoice` JSON field to User model (tone, style, recurring themes, hashtags, dos/don'ts)
- New AI tool: `updateBrandVoice` — AI updates the brand profile as it learns from conversations
- System prompt includes brand voice on every request
- AI detects patterns from successful posts and refines voice over time

### 1.2 Enhanced Analytics Tools

Expose existing Zernio endpoints as AI tools:

| Tool | Zernio Endpoint | Purpose |
|------|----------------|---------|
| `getFollowerStats` | `/v1/accounts/follower-stats` | Already in mutations.ts — just expose as tool |
| `getAccountHealth` | `/v1/accounts/health` | Already in mutations.ts — just expose as tool |
| `getContentDecay` | `/v1/analytics/content-decay` | Identify posts losing engagement |
| `getPostingFrequency` | `/v1/analytics/posting-frequency` | Detect under/over-posting per platform |
| `getInstagramInsights` | `/v1/analytics/instagram/account-insights` | Rich IG metrics |
| `getInstagramDemographics` | `/v1/analytics/instagram/demographics` | Audience demographics |
| `getYouTubeDemographics` | `/v1/analytics/youtube/demographics` | Audience demographics |
| `getYouTubeDailyViews` | `/v1/analytics/youtube/daily-views` | Video performance |

### 1.3 Content Validation Before Publishing

- Call `/v1/tools/validate/post` before every `createPost`
- AI auto-corrects content if validation fails (too long, invalid media, etc.)

### 1.4 Fix Model Routing

- Use Sonnet for ALL steps (not just step 0) — content quality is the product
- Or at minimum: use Sonnet for steps that produce user-visible text

---

## Phase 2 — Editorial Calendar (Queue API)

Let users say "post 3x/week Mon/Wed/Fri at 9am" and have it automated.

### New tools:

| Tool | Zernio Endpoint | Purpose |
|------|----------------|---------|
| `getQueueSlots` | `GET /v1/queue/slots` | View current schedule |
| `createQueueSlots` | `POST /v1/queue/slots` | Create recurring schedule |
| `updateQueueSlots` | `PUT /v1/queue/slots/{slotId}` | Modify schedule |
| `deleteQueueSlots` | `DELETE /v1/queue/slots/{slotId}` | Remove schedule |
| `getQueuePreview` | `GET /v1/queue/preview` | Preview upcoming slots |
| `getNextSlot` | `GET /v1/queue/next-slot` | Next available slot |
| `bulkUploadPosts` | `POST /v1/posts/bulk-upload` | Schedule a week of content at once |

### UX flow:
1. User: "Schedule content for next week"
2. AI: analyzes best times, proposes a calendar
3. User: approves or adjusts
4. AI: bulk-creates posts in queue slots

---

## Phase 3 — Community Management (Inbox API)

The feature that turns PostClaw from a scheduler into a true SMM.

### New tools:

| Tool | Zernio Endpoint | Purpose |
|------|----------------|---------|
| `listComments` | `GET /v1/inbox/comments` | Posts with comment counts |
| `getPostComments` | `GET /v1/inbox/comments/{postId}` | Comments on a specific post |
| `replyToComment` | `POST /v1/inbox/comments/{postId}` | Reply to a comment |
| `hideComment` | `POST /v1/inbox/comments/{postId}/{commentId}/hide` | Hide spam/toxic comments |
| `likeComment` | `POST /v1/inbox/comments/{postId}/{commentId}/like` | Like a comment |
| `listConversations` | `GET /v1/inbox/conversations` | DMs across all platforms |
| `getConversationMessages` | `GET /v1/inbox/conversations/{id}/messages` | Read a DM thread |
| `sendDirectMessage` | `POST /v1/inbox/conversations/{id}/messages` | Reply to a DM |

---

## Phase 4 — Automation

### Comment Automations
| Tool | Endpoint | Purpose |
|------|----------|---------|
| `listCommentAutomations` | `GET /v1/comment-automations` | View active automations |
| `createCommentAutomation` | `POST /v1/comment-automations` | Auto-reply rules |
| `deleteCommentAutomation` | `DELETE /v1/comment-automations/{id}` | Remove automation |

### Proactive Agent (Cron)
- Weekly performance digest via email/chat
- Alert when account needs reconnection
- Alert when a post performs exceptionally
- Suggest content when calendar is empty

---

## Phase 5 — Ads Management

No AI competitor does this. Full ads across 6 networks via Zernio.

| Tool | Endpoint | Purpose |
|------|----------|---------|
| `listAds` | `GET /v1/ads` | View active ads |
| `createAd` | `POST /v1/ads/create` | Create ad campaign |
| `boostPost` | `POST /v1/ads/boost` | Boost an existing post |
| `getAdAnalytics` | `GET /v1/ads/{adId}/analytics` | Ad performance |
| `listAudiences` | `GET /v1/ads/audiences` | Saved audiences |

---

## Not Planned (Low priority)

- WhatsApp Business features (niche use case)
- Google Business reviews (niche)
- Discord integration (niche)
- Reddit search/feed browsing (tangential to SMM)
