# API Routes

Routes are thin: validate input → call service → return response. **No business logic here** — it lives in `src/lib/services/`.

## Pattern

```typescript
import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json(
        { error: errorMessages.UNAUTHORIZED },
        { status: 401 }
      );
    }

    const body = await req.json();
    const data = someSchema.parse(body);
    const result = await someService({ userId: session.user.id, data });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return errorHandler(error);
  }
}
```

## Conventions

- **All routes auth-gated by default** via Better Auth session check. Exceptions: `/api/auth/[...all]`, `/api/inngest`, `/api/webhooks/*`.
- **Webhooks verify signatures** before doing anything.
  - `/api/webhooks/stripe` → Stripe signature; events deduped via `StripeEvent.id` unique insert.
  - `/api/webhooks/zernio` → HMAC-SHA256 with `ZERNIO_WEBHOOK_SECRET`. Handles `account.disconnected` (sends reconnect email), `account.connected`, `post.failed`, `post.partial`.
- **Zod schemas** live in `src/lib/schemas/`. Parse at the route boundary, hand validated input to services.
- **Errors** flow through `errorHandler` (`src/lib/errors/errorHandler.ts`) — maps Zod, Prisma, and known errors to HTTP responses + the global error store.
- **Long-running routes** set `export const maxDuration` (e.g. `/api/chat` runs the `generate_posts` tool synchronously and uses 240s).
- **Background work** goes in `src/inngest/functions/`. Routes fire events with `inngest.send(...)`, never block on long jobs.
