# PostClaw

> Your AI social media manager. Tell it what to post and it posts it for you.

PostClaw learns your brand from your website, plans content across 9 social platforms, and publishes on schedule. No editor, no dashboard to learn, no prompt engineering. Built for small business owners, solo founders, and creators who would rather make than post.

**Live:** [postclaw.io](https://www.postclaw.io)

---

## What it does

1. **Sign up.** A scoped Zernio publishing profile is provisioned automatically (Better Auth `user.create.after` hook).
2. **Onboard.** Paste your website URL — Firecrawl scrapes it, the AI engine extracts your brand voice, audience, products, and goals into a structured knowledge base. You confirm or edit.
3. **Connect.** OAuth into Instagram, Facebook, Twitter/X, Threads, LinkedIn, TikTok, YouTube, Pinterest, or Bluesky.
4. **Chat to draft.** A chat composer on `/d` calls five tools (`generate_posts`, `update_post`, `regenerate_post`, `delete_draft`, `set_schedule`) that wrap a Postgres-backed drafts board.
5. **Review and ship.** Drafts appear as cards. Click Post or Schedule. That's it.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, React 19, Server Components by default) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Database | PostgreSQL (Supabase) via Prisma 7 + `@prisma/adapter-pg` |
| Auth | Better Auth (magic link + Google OAuth) |
| Payments | Stripe SDK v20 (`2026-01-28.clover`), webhook idempotency via `StripeEvent` table |
| AI | AI SDK + Anthropic Sonnet 4.6 (insights, suggestions, rewrites, onboarding extraction) |
| Background jobs | Inngest (account analysis, insight refresh) |
| Social publishing | Zernio API (one master account, per-user scoped API keys) |
| Email | Resend (transactional) + Brevo (lifecycle) + React Email |
| CMS | Sanity (blog + alternatives pages) |
| Media | Cloudinary |
| Scraping | Firecrawl (onboarding only) |
| Analytics | PostHog |
| Hosting | Vercel (Fluid Compute) |

---

## Architecture at a glance

```
Next.js 16 (App Router, RSC)
  ├── (home)/         Public marketing pages
  ├── (dashboard)/    Auth-guarded app shell + /d routes
  ├── (onboarding)/   Two-step onboarding (knowledgeBase === null gate)
  └── api/            Thin route handlers — validate → service → return

src/lib/
  ├── services/       All business logic lives here
  ├── ai/             Anthropic provider + chat tools + prompt builders
  ├── late/           Zernio API client (legacy name preserved in code)
  ├── stripe/         Stripe client + plan resolution
  ├── db/             Prisma schema + adapter-pg client
  ├── schemas/        Zod schemas (parsed at API boundary)
  └── {brevo,firecrawl,cloudinary,sanity,better-auth}/  vendor adapters
```

**Design principles (enforced in code review):**

- Thin route handlers — they validate, call a service, and return. No business logic.
- Service layer owns vendor calls. Routes never import vendor SDKs directly.
- Server Components by default. Client components only when interactivity demands it.
- No barrel imports — import from source, never `index.ts`.
- Strict TypeScript everywhere. `any` is reserved for one generic API hook.
- Zod at every API boundary. No untyped JSON crossing the trust boundary.

See [`CLAUDE.md`](./CLAUDE.md) for the full architecture, data model, and the list of gotchas (Anthropic schema constraints, Prisma 7 adapter quirks, Stripe v20 period dates, Zernio's "Late" legacy naming, etc.).

---

## Local setup

### Prerequisites

- Node.js 24+
- Supabase CLI (for local Postgres) or any Postgres 15+
- API keys for: Anthropic, Stripe (test mode), Resend, Firecrawl, Zernio, Inngest, Sanity, Cloudinary, PostHog

### Steps

```bash
# 1. Install
npm install

# 2. Configure env
cp .env.example .env
# Fill in the values — see docs/environment.md for what each variable does.

# 3. Start local Postgres (Supabase)
supabase start

# 4. Run migrations
npm run db:migrate

# 5. Dev server
npm run dev
```

Open [localhost:3000](http://localhost:3000).

---

## Available scripts

```bash
npm run dev                # Next.js dev server
npm run build              # Production build
npm run vercel-build       # prisma generate + (prod) migrate deploy + next build
npm run lint               # ESLint
npm run db:migrate         # prisma migrate dev
npm run db:push            # prisma db push (no migration files)
npm run db:studio          # Prisma Studio
npm run email:dev          # React Email template preview
npm run backfill:insights  # tsx scripts/backfill-insights.ts
```

---

## Documentation

| File | What's in it |
|---|---|
| [`CLAUDE.md`](./CLAUDE.md) | Architecture, data model, coding standards, gotchas — the canonical engineering doc |
| [`docs/PRD.md`](./docs/PRD.md) | Product requirements, positioning, ICP |
| [`docs/environment.md`](./docs/environment.md) | Every environment variable, what reads it, and what breaks if it's missing |
| `src/components/dashboard/CLAUDE.md` | Dashboard design system tokens + component patterns |
| `src/lib/services/CLAUDE.md` | Insights schema + suggestion pipeline |
| `src/app/api/CLAUDE.md` | Route handler pattern |
| `src/lib/stripe/CLAUDE.md` | Stripe SDK v20 quirks + webhook events |

---

## Project history

The repository was bootstrapped from a personal Next.js SaaS starter in February 2026 and rewritten into PostClaw between March and May. Early commits (`"Initial commit: ClawdContent app from saas-boilerplate"` through `"redesign"`) reflect that rewrite — the dashboard, AI engine, Zernio integration, onboarding flow, and entire `src/lib/services/` layer were built after the rewrite branched off. Some legacy names survive in the codebase (most notably `lib/late/`, `LateProfile`, `lateApiKey` — Zernio's previous name was "Late") and are documented in `CLAUDE.md` rather than renamed to avoid churn-only migrations.

---

## License

[MIT](./LICENSE)
