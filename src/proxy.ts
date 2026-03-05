import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { DISTINCT_ID_COOKIE } from "@/lib/tracking/distinctId";

export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  if (!request.cookies.get(DISTINCT_ID_COOKIE)) {
    const distinctId = crypto.randomUUID();
    response.cookies.set(DISTINCT_ID_COOKIE, distinctId, {
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });
  }

  return response;
}

export const config = {
  matcher: ["/"],
};
