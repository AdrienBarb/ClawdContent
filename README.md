# PostClaw

A modern Next.js SaaS application with authentication, database, email, payments, analytics, rate limiting, and SEO optimization.

## Tech Stack

### Core
- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **React 19** - Latest React features

### Styling
- **Tailwind CSS v4** - Utility-first CSS framework
- **shadcn/ui** - Beautiful, accessible component library
- **Lucide React** - Icon library

### Database & ORM
- **Prisma** - Next-generation ORM
- **PostgreSQL** - Database (via Supabase)
- **Supabase** - Local development database

### Authentication
- **Better-auth** - Modern authentication library
- Magic link authentication (passwordless)
- Email & password authentication
- Session management

### Payments
- **Stripe** - Payment processing
- Webhook handling for subscription events
- One-time and recurring payments

### State Management
- **Zustand** - Lightweight client state management
- **TanStack Query (React Query)** - Server state management

### Email
- **Resend** - Email delivery service
- **React Email** - Build emails with React
- Pre-built email templates

### Analytics
- **PostHog** - Product analytics (client & server-side)

### Rate Limiting
- **Upstash Redis** - Rate limiting for API protection

### SEO
- Dynamic robots.txt and sitemap.xml
- llms.txt for AI discoverability
- Open Graph and Twitter card metadata
- Centralized SEO configuration

## Features

- Authentication with Better-auth (Magic Link + Email/Password)
- Database with Prisma + PostgreSQL (Supabase)
- Email sending with Resend + React Email
- Waitlist functionality with rate limiting
- Payment processing with Stripe
- Centralized error handling
- API client with React Query hooks
- State management with Zustand
- Analytics with PostHog
- Rate limiting with Upstash Redis
- SEO optimization (robots.txt, sitemap, llms.txt)
- UI components with shadcn/ui
- TypeScript throughout
- Tailwind CSS v4 styling

## Quick Start

### Prerequisites

- **Node.js 18+**
- **Docker Desktop** (for local Supabase)

### Setup

1. **Clone and install:**
```bash
git clone <your-repo-url>
cd PostClaw
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your values
```

3. **Start local database:**
```bash
supabase start
```

4. **Setup database schema:**
```bash
npm run db:migrate
# Or for quick setup: npm run db:push
```

5. **Start development:**
```bash
npm run dev
```

Visit http://localhost:3000

## Environment Variables

### Required

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54325/postgres"
DIRECT_URL="postgresql://postgres:postgres@127.0.0.1:54325/postgres"

# Authentication
BETTER_AUTH_SECRET="your-secret-min-32-chars"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"

# Email
RESEND_API_KEY="re_your_api_key"

# Payments
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Rate Limiting
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."
```

### Optional

```env
# Analytics
NEXT_PUBLIC_POSTHOG_KEY="phc_..."
NEXT_PUBLIC_POSTHOG_HOST="https://app.posthog.com"

# Environment
NEXT_PUBLIC_APP_ENV="development"
```

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── auth/          # Better-auth endpoints
│   │   ├── waitlist/      # Waitlist endpoint
│   │   └── webhooks/      # Stripe webhooks
│   ├── robots.ts          # SEO robots.txt
│   ├── sitemap.ts         # SEO sitemap.xml
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── sections/         # Landing page sections
│   └── providers/        # Context providers
├── lib/                  # Library code
│   ├── api/             # Axios instance
│   ├── better-auth/     # Auth configuration
│   ├── constants/       # App constants & error messages
│   ├── db/              # Prisma client & schema
│   ├── emails/          # Email templates
│   ├── errors/          # Error handler
│   ├── hooks/           # Custom React hooks
│   ├── ratelimit/       # Rate limiting utilities
│   ├── resend/          # Email client
│   ├── schemas/         # Zod validation schemas
│   ├── services/        # Business logic services
│   ├── seo/             # SEO utilities
│   ├── stores/          # Zustand stores
│   ├── stripe/          # Stripe client
│   └── tracking/        # PostHog client
├── data/                # Static data
└── public/              # Static assets
    └── llms.txt         # LLM discovery file
```

## Configuration

All project configuration is in `config.json`:

```json
{
  "project": {
    "name": "YourProject",
    "brandName": "YourProject",
    "description": "Your description",
    "url": "https://yourproject.com"
  },
  "seo": {
    "title": "YourProject - Main Value",
    "keywords": ["keyword1", "keyword2"]
  },
  "contact": {
    "email": "hello@yourproject.com"
  },
  "pricing": {
    "plans": [...]
  }
}
```

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run db:generate  # Generate Prisma Client
npm run db:migrate   # Run database migrations
npm run db:push      # Push schema to database
npm run db:studio    # Open Prisma Studio
npm run email:dev    # Preview email templates
```

## API Patterns

### Authenticated Route

```typescript
import { auth } from "@/lib/better-auth/auth";
import { errorHandler } from "@/lib/errors/errorHandler";
import { errorMessages } from "@/lib/constants/errorMessage";
import { headers } from "next/headers";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: errorMessages.UNAUTHORIZED },
        { status: 401 }
      );
    }

    // Your logic here
  } catch (error) {
    return errorHandler(error);
  }
}
```

### Rate-Limited Public Route

```typescript
import { checkRateLimit } from "@/lib/ratelimit/checkRateLimit";
import { publicLimiter } from "@/lib/ratelimit/client";

export async function POST(req: NextRequest) {
  try {
    const rateLimit = await checkRateLimit(req, publicLimiter);
    if (!rateLimit.success) return rateLimit.response;

    // Your logic here
  } catch (error) {
    return errorHandler(error);
  }
}
```

## Client-Side Data Fetching

```typescript
import useApi from "@/lib/hooks/useApi";

function MyComponent() {
  const { useGet, usePost } = useApi();

  const { data, isLoading } = useGet("/endpoint");
  const { mutate } = usePost("/endpoint", {
    onSuccess: () => console.log("Success!"),
  });

  return <button onClick={() => mutate({ data })}>Submit</button>;
}
```

## Adding shadcn/ui Components

```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
npx shadcn@latest add form
```

## Documentation

- [CLAUDE.md](./CLAUDE.md) - Comprehensive project documentation
- [Next.js](https://nextjs.org/docs)
- [Prisma](https://www.prisma.io/docs)
- [Better-auth](https://www.better-auth.com/docs)
- [Stripe](https://stripe.com/docs)
- [Upstash](https://upstash.com/docs)
- [shadcn/ui](https://ui.shadcn.com)

## License

MIT
