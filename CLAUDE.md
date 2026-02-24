# CLAUDE.md

## Project Overview

**ClawdContent** is a SaaS application built on a production-ready stack with authentication, database, email, payments, analytics, and rate limiting.

**What's included:**
- Authentication with email/password and magic links (Better Auth)
- PostgreSQL database with Prisma ORM
- Email sending with Resend + React Email templates
- Payment processing with Stripe (one-time and subscriptions)
- Analytics with PostHog (server & client-side)
- Rate limiting with Upstash Redis
- SEO optimization (robots.txt, sitemap, llms.txt, metadata)
- Responsive UI with Tailwind CSS + shadcn/ui

**Who it's for:**
- Developers who want to launch a SaaS product quickly
- Indie hackers building their next project
- Teams that need a solid foundation to build on

## Tech Stack

- **Next.js 16** (App Router) + TypeScript + React 19
- **Prisma** + PostgreSQL (Supabase)
- **Better Auth** for authentication
- **Stripe** for payments
- **Resend** + React Email for transactional emails
- **Upstash Redis** for rate limiting
- **React Query** (via useApi hook) for client-side data fetching
- **Zustand** for client-side global state
- **react-hook-form** + Zod for form handling and validation
- **Tailwind CSS** + shadcn/ui for styling
- **PostHog** for analytics

## Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npx prisma migrate dev    # Run migrations
npx prisma generate       # Generate Prisma client
npx prisma studio         # Open Prisma Studio GUI
npm run email:dev         # Preview email templates
```

## Project Structure

```
src/
├── app/                  # Next.js App Router pages
│   ├── api/              # API route handlers
│   │   ├── auth/         # Authentication routes
│   │   ├── webhooks/     # Payment webhooks
│   │   └── waitlist/     # Waitlist endpoints
│   ├── (home)/           # Public pages layout
│   └── (dashboard)/      # Authenticated pages layout
├── components/           # React components
│   ├── ui/               # shadcn/ui components
│   ├── sections/         # Landing page sections
│   ├── navbar/           # Navigation components
│   └── providers/        # Context providers
├── lib/
│   ├── api/              # Axios instance with interceptors
│   ├── better-auth/      # Authentication setup
│   ├── constants/        # App constants (error messages, etc.)
│   ├── db/               # Prisma client & schema
│   ├── emails/           # React Email templates
│   ├── errors/           # Error handler
│   ├── hooks/            # Custom hooks (useApi)
│   ├── ratelimit/        # Upstash rate limiters
│   ├── resend/           # Resend email client
│   ├── schemas/          # Zod validation schemas
│   ├── seo/              # SEO utilities
│   ├── services/         # Business logic services
│   ├── stores/           # Zustand stores
│   ├── stripe/           # Stripe client
│   ├── tracking/         # PostHog analytics
│   └── utils/            # Utility functions
└── data/                 # Static data (site metadata)
```

## Data Model

```
User (1) ──→ (N) Session
     (1) ──→ (N) Account
```

### Key Entities

| Entity       | Purpose                                      |
| ------------ | -------------------------------------------- |
| **User**     | Authenticated user                           |
| **Session**  | User session for auth                        |
| **Account**  | OAuth/password account info                  |
| **Waitlist** | Pre-launch email collection                  |

## Key Files

| File                                  | Purpose                               |
| ------------------------------------- | ------------------------------------- |
| `src/lib/hooks/useApi.ts`             | Centralized API hook (React Query)    |
| `src/lib/constants/errorMessage.ts`   | Centralized error messages            |
| `src/lib/errors/errorHandler.ts`      | Centralized error handler             |
| `src/lib/better-auth/auth.ts`         | Authentication configuration          |
| `src/lib/ratelimit/client.ts`         | Upstash Redis rate limiters           |
| `src/lib/ratelimit/checkRateLimit.ts` | Rate limit check utility              |
| `src/lib/stripe/client.ts`            | Stripe client setup                   |
| `config.json`                         | Project configuration (name, SEO, etc)|

## API Routes

| Route                    | Methods | Purpose                        | Auth Required |
| ------------------------ | ------- | ------------------------------ | ------------- |
| `/api/auth/[...all]`     | All     | Better Auth routes             | Various       |
| `/api/waitlist`          | POST    | Join waitlist                  | No            |
| `/api/webhooks/stripe`   | POST    | Handle Stripe payment events   | No            |

### Rate Limiting

Public endpoints should be rate-limited to prevent abuse. Use Upstash Redis for rate limiting:

```typescript
import { checkRateLimit } from "@/lib/ratelimit/checkRateLimit";
import { publicLimiter } from "@/lib/ratelimit/client";

export async function POST(req: NextRequest) {
  const rateLimit = await checkRateLimit(req, publicLimiter);
  if (!rateLimit.success) return rateLimit.response;
  // ... rest of logic
}
```

---

## Coding Standards

### Core Principles

1. **Type Safety First**: Always use TypeScript types. Avoid `any` unless absolutely necessary.
2. **Server Components Default**: Use Server Components by default, Client Components only when needed.
3. **Code Reusability**: Extract reusable logic into utilities, hooks, and services.
4. **Readability**: Split complex code into smaller, well-named functions/components.

### File Naming

- **Components**: PascalCase (`UserProfile.tsx`)
- **Utilities/Hooks/Services**: camelCase (`formatDate.ts`, `useApi.ts`)
- **Constants**: UPPER_SNAKE_CASE (`API_BASE_URL`)
- **No index files**: Never create `index.ts` for re-exporting. Always import directly from source.

### API Routes Pattern

**Authenticated Route:**
```typescript
import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";

export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const validatedData = someSchema.parse(body);
    const result = await someService({ userId: session.user.id, data: validatedData });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return errorHandler(error);
  }
}
```

**Public Route with Rate Limiting:**
```typescript
import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { NextResponse, NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/ratelimit/checkRateLimit";
import { publicLimiter } from "@/lib/ratelimit/client";

export async function POST(req: NextRequest) {
  try {
    // Rate limit check (FIRST THING in public routes)
    const rateLimit = await checkRateLimit(req, publicLimiter);
    if (!rateLimit.success) return rateLimit.response;

    const body = await req.json();
    const validatedData = someSchema.parse(body);
    const result = await someService({ data: validatedData });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return errorHandler(error);
  }
}
```

### Client-Side Data Fetching (useApi Hook)

Always use `useApi` hook for client-side API calls. Never use axios directly.

```typescript
import useApi from "@/lib/hooks/useApi";

// GET request
const { useGet } = useApi();
const { data, isLoading, error } = useGet("/endpoint", { param: "value" });

// POST request
const { usePost } = useApi();
const { mutate: createItem, isPending } = usePost("/endpoint", {
  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: ["items"] });
  },
});
```

### Service Layer Pattern

Extract database logic to `src/lib/services/`. Services should be reusable and single-responsibility.

```typescript
import { prisma } from "@/lib/db/prisma";

export async function createUser({
  email,
  name,
}: {
  email: string;
  name: string;
}) {
  return await prisma.user.create({
    data: { email, name },
  });
}
```

### Validation with Zod

Define schemas in `src/lib/schemas/`. Use for request validation in API routes.

```typescript
import { z } from "zod";

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
});
```

### Forms (react-hook-form + Zod + shadcn/ui)

Always use `react-hook-form` with Zod validation and shadcn/ui Form components for all forms.

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const formSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
});

type FormValues = z.infer<typeof formSchema>;

export function MyForm() {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", name: "" },
  });

  const onSubmit = (data: FormValues) => {
    // Handle submission
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="email@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}
```

### Styling & Design

- Use Tailwind CSS utility classes
- Use shadcn/ui components from `@/components/ui/` for all UI elements
- Use theme-aware classes (`text-foreground`, `bg-background`, `text-muted-foreground`, etc.)
- **Respect the existing design**: Match the current app's visual style, spacing, and color palette
- Do not introduce new colors or design patterns without explicit approval
- Keep UI consistent with existing components and pages

### Import Organization

```typescript
// External
import { NextRequest } from "next/server";
import { z } from "zod";

// Internal
import { prisma } from "@/lib/db/prisma";
import { errorHandler } from "@/lib/errors/errorHandler";

// Types
import type { User } from "@prisma/client";
```

## Environment Variables

```env
# Database (Supabase PostgreSQL)
DATABASE_URL=
DIRECT_URL=

# Authentication
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=
NEXT_PUBLIC_BASE_URL=

# Email (Resend)
RESEND_API_KEY=

# Analytics (PostHog)
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=

# App Environment
NEXT_PUBLIC_APP_ENV=

# Payments (Stripe)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Rate Limiting (Upstash Redis)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

## MCP Servers

This project uses MCP (Model Context Protocol) servers to extend Claude Code capabilities.

### Available Servers

| Server | Purpose |
|--------|---------|
| **context7** | Up-to-date documentation for Next.js, Prisma, Stripe, React Query, etc. |
| **puppeteer** | Browser automation, screenshots, UI testing |
| **github** | PR creation, issue management, branch operations |
| **prisma** | Migration status, schema management, Prisma CLI |
| **postgres** | Direct database queries for debugging |

### Usage Guidelines

1. **Always use Context7** when working with external libraries:
   - Before implementing features with Next.js, Prisma, Stripe, or any library
   - Add `use context7` to prompts or let the skill auto-detect

2. **Use Puppeteer** for:
   - Taking screenshots of the UI
   - Visual regression testing
   - Debugging frontend issues

3. **Use GitHub MCP** for:
   - Creating PRs with proper descriptions
   - Managing issues
   - Branch operations

4. **Use Prisma MCP** for:
   - Checking migration status (`prisma migrate status`)
   - Generating client after schema changes
   - Database workflow assistance

5. **Use PostgreSQL MCP** for:
   - Debugging data issues with direct SQL queries
   - Exploring database state
   - Quick data verification

### Configuration

MCP servers are configured in `.claude/settings.local.json`. Ensure environment variables are set:

- `GITHUB_PERSONAL_ACCESS_TOKEN` for GitHub operations
- `DATABASE_URL` for PostgreSQL access

## Getting Started

1. Clone this repository
2. Copy `.env.example` to `.env` and fill in the values
3. Run `npm install`
4. Run `npx prisma generate` to generate Prisma client
5. Run `npx prisma migrate dev` to run migrations
6. Run `npm run dev` to start the development server
7. Open `http://localhost:3000`

## Configuration

All project configuration is centralized in `config.json`:
- Project name, description, tagline
- SEO metadata (title, description, keywords)
- Contact information
- Social links
- Pricing plans
- Feature flags
