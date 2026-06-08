import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { DISTINCT_ID_COOKIE } from "@/lib/tracking/distinctId";
import { UTM_COOKIE, extractUtmFromUrl } from "@/lib/tracking/utm";

export function proxy(request: NextRequest) {
  // Expose the pathname to server components (layouts can't read it otherwise).
  // Metadata only — auth still lives in route handlers + (dashboard)/layout.tsx.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  // Set anonymous distinct ID on first visit
  if (!request.cookies.get(DISTINCT_ID_COOKIE)) {
    const distinctId = crypto.randomUUID();
    response.cookies.set(DISTINCT_ID_COOKIE, distinctId, {
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });
  }

  // Capture UTM params + referrer on first visit (first-touch attribution)
  if (!request.cookies.get(UTM_COOKIE)) {
    const utmData = extractUtmFromUrl(request.nextUrl);
    const referrer = request.headers.get("referer");

    if (utmData || referrer) {
      const data = { ...utmData, referrer: referrer || undefined };
      response.cookies.set(UTM_COOKIE, JSON.stringify(data), {
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: "/",
        httpOnly: true,
        sameSite: "lax",
      });
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
