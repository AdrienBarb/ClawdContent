# ContentClaw - Architecture Analysis & Implementation Plan

## Architecture Analysis

### What You Have (from the boilerplate)

The existing ClawdContent codebase gives you a solid foundation:

- **Auth**: Better Auth with magic link login (fully working)
- **Payments**: Stripe client initialized + webhook skeleton (business logic is TODO)
- **Database**: Prisma + PostgreSQL with User/Session/Account/Waitlist models
- **Rate Limiting**: Upstash Redis (3 limiters configured)
- **Email**: Resend + React Email (3 templates: magic link, welcome, waitlist)
- **Analytics**: PostHog (server + client)
- **UI**: shadcn/ui components, landing page sections (Hero, Features, Pricing)
- **API patterns**: Authenticated + public route patterns established
- **Data fetching**: useApi hook (React Query wrapper) ready

**What's missing**: No dashboard pages built. No middleware.ts for protected routes. Stripe webhook handlers are all empty TODOs. No subscription/payment models in the database.

---

### Critical Issues & Risks

#### 1. Social Posting via Late API (LOW RISK - SOLVED)

Using [Late (getlate.dev)](https://getlate.dev) as the unified social media API. Late solves the biggest architectural risk:

- **Programmatic OAuth**: Headless mode lets us embed social account connections directly in our dashboard
- **Single API key**: One Late account with profiles per user (no separate accounts needed)
- **13 platforms**: X, Instagram, Facebook, LinkedIn, TikTok, YouTube, Pinterest, Reddit, Bluesky, Threads, Google Business, Telegram, Snapchat
- **Official OpenClaw skill**: `late-api` on ClawHub
- **Node.js SDK**: `@getlatedev/node`
- **Webhooks**: `post.published`, `post.failed`, `post.partial`, `account.disconnected`

**Pricing** (we pay, not the user):
| Tier | Cost | Profiles | Posts/month |
|------|------|----------|-------------|
| Accelerate | $49/mo | 50 | Unlimited |
| Unlimited | $999/mo | Unlimited | Unlimited |

Start with Accelerate ($49/mo for first 50 users), upgrade to Unlimited when needed.

#### 2. Railway Per-User Container Economics (MEDIUM RISK)

Each OpenClaw container consumes resources even when idle:

| Resource | Per Container | 100 Users | 500 Users |
|----------|--------------|-----------|-----------|
| RAM (~256MB idle) | ~$2.56/mo | ~$256/mo | ~$1,280/mo |
| CPU (~0.1 vCPU idle) | ~$2.00/mo | ~$200/mo | ~$1,000/mo |
| Railway Pro plan | $20/mo | $20/mo | $20/mo |
| **Total infra** | ~$4.56/user/mo | ~$476/mo | ~$2,300/mo |

**Key constraints**:
- 100 services per Railway project (use multiple projects)
- API rate limit: 10,000 RPH on Pro plan
- Variable upsert triggers container redeploy by default

**Optimization opportunities**:
- Enable Railway's "Serverless" mode so idle containers sleep (saves ~80% on idle costs)
- Use NVIDIA's free Kimi K2.5 API tier to eliminate LLM costs for default users

#### 3. OpenClaw Configuration via Environment Variables (MEDIUM RISK)

OpenClaw's primary config is `openclaw.json` + files on disk (`SOUL.md`, skill folders).

**Solution**: Build a **custom OpenClaw Docker image** that:
- Includes the SOUL.md (content manager persona) baked in
- Includes the Late API skill pre-installed
- Reads dynamic config (Telegram token, LLM keys, Late API key) from env vars
- Has an entrypoint script that generates `openclaw.json` from env vars before starting

#### 4. User Setup Friction (LOW RISK with Late)

With Late handling social accounts programmatically, the user only needs to:
1. Create a ContentClaw account (magic link)
2. Create a Telegram bot via BotFather and paste the token
3. Connect social accounts via OAuth (embedded in our dashboard via Late headless mode)

That's much simpler than before. The BotFather step needs clear guided instructions.

---

### Recommended Architecture

```
                    ┌─────────────────────────────────────┐
                    │         Vercel (Next.js App)         │
                    │                                      │
                    │  ┌──────────┐  ┌──────────────────┐ │
                    │  │ Dashboard │  │   API Routes     │ │
                    │  │  (React) │  │  /api/assistant   │ │
                    │  │          │  │  /api/webhooks    │ │
                    │  └──────────┘  └────────┬─────────┘ │
                    └─────────────────────────┼───────────┘
                                              │
                    ┌─────────────────────────┼───────────┐
                    │                         ▼           │
                    │  ┌──────────────────────────────┐   │
                    │  │     Railway Service Layer     │   │
                    │  │   (GraphQL API calls to       │   │
                    │  │    create/manage containers)   │   │
                    │  └──────────────────────────────┘   │
                    │                                      │
                    │  ┌────────┐ ┌────────┐ ┌────────┐  │
                    │  │User A  │ │User B  │ │User C  │  │
                    │  │OpenClaw│ │OpenClaw│ │OpenClaw│  │
                    │  │Container│ │Container│ │Container│ │
                    │  │        │ │        │ │        │  │
                    │  │Telegram│ │Telegram│ │Telegram│  │
                    │  │Bot     │ │Bot     │ │Bot     │  │
                    │  └───┬────┘ └───┬────┘ └───┬────┘  │
                    │      │          │          │        │
                    │      Railway (Docker Containers)    │
                    └──────┼──────────┼──────────┼────────┘
                           │          │          │
                           ▼          ▼          ▼
                    ┌──────────────────────────────────┐
                    │        Telegram Bot API           │
                    │     (long polling per bot)        │
                    └──────────────────────────────────┘
                           │          │          │
                           ▼          ▼          ▼
                    ┌──────────────────────────────────┐
                    │        Late API (getlate.dev)     │
                    │   (13 social media platforms)     │
                    └──────────────────────────────────┘
```

**Key design decisions:**
1. **One Railway project per ~50 users** (stay under 100-service limit with headroom)
2. **Custom Docker image** with SOUL.md and Late API skill baked in
3. **Env vars for all dynamic config** (Telegram token, API keys, LLM selection)
4. **No public networking needed** on Railway containers (outbound calls only)
5. **Health checks via Railway API** (query deployment status + runtime logs)
6. **Late headless OAuth** for embedding social account connections in our dashboard
7. **One Late profile per user** mapped to their ContentClaw account

---

### Database Schema Extensions

```
User (existing)
  ├── Subscription (new, 1:1)
  │   ├── stripeCustomerId
  │   ├── stripeSubscriptionId
  │   ├── status (active/past_due/canceled/trialing)
  │   ├── currentPeriodStart
  │   ├── currentPeriodEnd
  │   └── cancelAtPeriodEnd
  │
  └── Assistant (new, 1:1)
      ├── railwayProjectId
      ├── railwayServiceId
      ├── railwayEnvironmentId
      ├── railwayDeploymentId
      ├── status (provisioning/healthy/error/stopped)
      ├── telegramBotToken (encrypted)
      ├── telegramBotUsername
      ├── lateProfileId
      ├── llmProvider (kimi/openrouter/anthropic)
      ├── llmApiKey (encrypted)
      ├── llmModel
      └── lastHealthCheck
```

---

## Implementation Plan (MVP)

### Phase 0: Validate Core Assumption (1-2 days)

**Goal**: Prove we can deploy an OpenClaw container on Railway via API from the Next.js app, and that Late API + OpenClaw + Telegram work together.

**Steps**:
1. Build a Railway GraphQL client in the Next.js app (`src/lib/railway/client.ts`)
2. Create an API route (`POST /api/test/deploy`) that provisions a test OpenClaw container on Railway via API
3. Set env vars on the container (TELEGRAM_BOT_TOKEN, LLM config, Late API key)
4. Verify the bot responds on Telegram
5. Verify Late API can post to social media via the OpenClaw skill
6. Test updating env vars via API and confirm container restarts

**Why first**: If Railway API provisioning doesn't work from our Next.js app, the entire architecture needs rethinking.

**Deliverable**: A working OpenClaw bot deployed on Railway via API, responding on Telegram, posting via Late API.

---

### Phase 1: Custom Docker Image (2-3 days)

**Goal**: Build a pre-configured OpenClaw Docker image for ContentClaw users.

**Steps**:
1. Create a `Dockerfile` that:
   - Starts from the official OpenClaw image
   - Copies in the SOUL.md (content manager persona)
   - Pre-installs the Late API skill (`late-api`)
   - Includes an entrypoint script that generates `openclaw.json` from env vars
2. Write the SOUL.md content manager persona
3. Write the entrypoint script that maps env vars to openclaw.json:
   - `TELEGRAM_BOT_TOKEN` -> channels.telegram.botToken
   - `MOONSHOT_API_KEY` -> models.providers.moonshot.apiKey
   - `LATE_API_KEY` -> skills.entries.late-api.apiKey
   - `LLM_PROVIDER` -> agents.defaults.model.primary
   - `LLM_API_KEY` -> dynamic provider config
   - `DM_POLICY` -> channels.telegram.dmPolicy (set to "open" with allowFrom: ["*"])
4. Push to Docker Hub or GitHub Container Registry
5. Test deploying this image on Railway with just env vars

**Deliverable**: A Docker image that boots a fully configured content manager bot from env vars alone.

---

### Phase 2: Railway Provisioning Service (3-4 days)

**Goal**: Build a service layer that can programmatically create/manage user containers via Railway's GraphQL API.

**Steps**:
1. Create `src/lib/railway/client.ts` - Railway GraphQL client with auth token
2. Create `src/lib/railway/mutations.ts` - Key mutations:
   - `createProject()` - creates a new Railway project (when current project is full)
   - `createService()` - creates a service from the Docker image
   - `setVariables()` - sets all env vars via `variableCollectionUpsert`
   - `triggerDeploy()` - triggers a deployment
   - `stopDeployment()` - stops a running deployment
   - `restartDeployment()` - restarts a deployment
   - `getDeploymentStatus()` - queries deployment health
   - `getRuntimeLogs()` - gets recent logs for debugging
3. Create `src/lib/services/assistant.ts` - Business logic:
   - `provisionAssistant(userId)` - full provisioning flow
   - `updateAssistantConfig(userId, config)` - update env vars + restart
   - `stopAssistant(userId)` - stop container
   - `startAssistant(userId)` - start container
   - `getAssistantHealth(userId)` - check health
4. Add error handling, retries, and idempotency

**Deliverable**: A tested service layer that can provision, configure, and manage OpenClaw containers on Railway.

---

### Phase 3: Database Schema & Stripe Integration (3-4 days)

**Goal**: Extend the database, implement Stripe subscription flow, and wire up webhooks.

**Steps**:
1. Extend Prisma schema with `Subscription` and `Assistant` models
2. Run migration: `npx prisma migrate dev`
3. Create Stripe product + price ($39/mo subscription) in Stripe Dashboard
4. Update `config.json` with the Stripe price ID
5. Create API route `POST /api/checkout` - creates Stripe Checkout session
6. Implement Stripe webhook handlers:
   - `checkout.session.completed` -> create Subscription record, trigger assistant provisioning
   - `customer.subscription.updated` -> update Subscription status
   - `customer.subscription.deleted` -> stop Railway container, update status
   - `invoice.payment_failed` -> mark as past_due, optionally stop container after grace period
   - `invoice.payment_succeeded` -> ensure container is running
7. Create `src/lib/services/subscription.ts` - Subscription management service
8. Add Stripe Customer Portal for self-service billing management

**Deliverable**: Working payment flow -- user pays $39/mo, container gets provisioned. Payment fails, container stops.

---

### Phase 4: Dashboard - Core Pages (4-5 days)

**Goal**: Build the authenticated dashboard where users configure their assistant.

#### 4a. Protected Routes Infrastructure
1. Create `src/middleware.ts` for auth-based route protection
2. Create dashboard layout at `src/app/(dashboard)/d/layout.tsx`
3. Create sidebar/navigation component for the dashboard

#### 4b. Dashboard Home (`/d`)
- Assistant status card (provisioning/healthy/error/stopped)
- Health indicator with auto-refresh
- Quick action buttons: Start/Stop/Restart
- Getting started checklist for new users

#### 4c. Telegram Connection Page (`/d/telegram`)
- Step-by-step BotFather instructions
- Bot token input field (masked/encrypted)
- Save -> calls API to update Railway env vars -> restart container
- Connection status indicator

#### 4d. Social Accounts Page (`/d/social`)
- Grid of 13 platforms showing connection status
- Each platform: OAuth connect button (via Late headless mode)
- Connected accounts show username + disconnect option
- All managed via Late API (`GET /v1/connect/get-connect-url` with headless mode)

#### 4e. LLM Settings Page (`/d/model`)
- Current model display (default: Kimi K2.5)
- Dropdown to select provider
- API key input for the selected provider
- Save -> updates Railway env vars -> restart container

#### 4f. Billing Page (`/d/billing`)
- Current plan display ($39/mo)
- Subscription status
- "Manage Billing" -> Stripe Customer Portal

#### 4g. Settings Page (`/d/settings`)
- Account settings (email, name)
- Danger zone: delete account + stop container

**API Routes needed**:
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/assistant` | GET | Get assistant status & config |
| `/api/assistant/telegram` | PUT | Update Telegram bot token |
| `/api/assistant/social/connect` | GET | Get Late OAuth URL for a platform |
| `/api/assistant/social/accounts` | GET | List connected social accounts |
| `/api/assistant/social/disconnect` | DELETE | Disconnect a social account |
| `/api/assistant/model` | PUT | Update LLM configuration |
| `/api/assistant/action` | POST | Start/stop/restart assistant |
| `/api/assistant/health` | GET | Check assistant health |
| `/api/checkout` | POST | Create Stripe checkout session |
| `/api/billing/portal` | POST | Create Stripe Customer Portal session |
| `/api/webhooks/late` | POST | Handle Late webhook events |

---

### Phase 5: Landing Page & Polish (2-3 days)

**Goal**: Update the landing page for ContentClaw's value proposition, add onboarding flow.

**Steps**:
1. Update `config.json` with ContentClaw branding, features, pricing ($39/mo single plan)
2. Rewrite HeroSection for the "AI content manager on Telegram" pitch
3. Update FeaturesSection with ContentClaw features:
   - Telegram-native AI assistant
   - Post to 13 social platforms
   - Research trending topics
   - Schedule and automate
   - Customize your AI model
4. Simplify PricingSection to single $39/mo plan
5. Add "How it works" section (3-step visual)
6. Add onboarding flow for new users after payment:
   - Step 1: Create Telegram bot (guided)
   - Step 2: Connect social accounts (embedded OAuth)
   - Step 3: Start chatting
7. Write legal pages (Terms, Privacy)
8. SEO optimization

---

### Phase 6: Monitoring & Production Hardening (2-3 days)

**Goal**: Make it production-ready.

**Steps**:
1. Background job: periodic health checks on all active containers
2. Alert system: email user if their bot goes down
3. Encryption: encrypt stored API keys at rest
4. Error recovery: auto-restart containers that crash
5. Logging: structured logging for all Railway API calls
6. Rate limiting: protect all new API routes
7. Edge cases: handle Railway API failures gracefully
8. Billing edge cases: grace period for failed payments before stopping container

---

## Build Order Summary

| Phase | Duration | Dependencies | Deliverable |
|-------|----------|-------------|-------------|
| **0: Validate** | 1-2 days | None | Railway API provisioning + Late + OpenClaw + Telegram working |
| **1: Docker Image** | 2-3 days | Phase 0 | Custom Docker image with SOUL.md + Late skill |
| **2: Railway Service** | 3-4 days | Phase 1 | Programmatic container provisioning |
| **3: DB + Stripe** | 3-4 days | Phase 0 | Payment flow + provisioning trigger |
| **4: Dashboard** | 4-5 days | Phase 2, 3 | Full user dashboard |
| **5: Landing + Polish** | 2-3 days | Phase 4 | Marketing site + onboarding |
| **6: Hardening** | 2-3 days | Phase 4 | Production readiness |

**Phases 2 and 3 can be built in parallel.**

**Total estimated effort: ~17-24 days to MVP.**

---

## Cost Model Per User

| Item | Monthly Cost | Notes |
|------|-------------|-------|
| Railway container | ~$3-5 | With Serverless mode, idle most of the time |
| Kimi K2.5 (NVIDIA free tier) | $0 | Free, but may have undisclosed limits |
| Kimi K2.5 (Moonshot paid) | ~$1-3 | Depends on usage |
| Late API (shared) | ~$1-2 | $49/mo Accelerate / 50 users = ~$1/user |
| Supabase (shared) | ~$0.25 | Pro plan cost / users |
| Vercel (shared) | ~$0.20 | Pro plan cost / users |
| **Total COGS per user** | **~$4-10** | |
| **Revenue per user** | **$39** | |
| **Gross margin** | **~$29-35** | ~75-90% gross margin |

Much healthier than before -- Late cost is absorbed and amortized across users.

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Railway cold starts with Serverless | Medium | Medium | Test thoroughly; disable Serverless if needed |
| OpenClaw Docker image instability | Medium | Medium | Pin to specific version, monitor crashes |
| Kimi K2.5 free tier disappears | Medium | Low | Fall back to paid Moonshot API |
| Railway API rate limits during growth spike | Low | Medium | Batch operations, queue provisioning |
| Late API outage | Low | Medium | Webhook monitoring, retry logic |
| Late Accelerate profile limit (50) | Low | Low | Upgrade to Unlimited at ~50 users |
| OpenClaw project direction change | Medium | Medium | Fork and maintain custom image if needed |
