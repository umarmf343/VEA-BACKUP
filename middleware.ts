// middleware.ts
// Purpose: Provide safe defaults for API requests (CORS + preflight) and add a request ID.
// Notes:
// - Applies CORS headers to /api/* routes.
// - Handles OPTIONS preflight with a 204 response.
// - Adds an x-request-id header to all responses for easier debugging.
// - Does NOT enforce auth here; plug in role checks later if needed.

import { NextResponse, type NextRequest } from "next/server";

import { authService } from "@/lib/auth-service";

export async function middleware(req: NextRequest) {
  const requestHeaders = new Headers(req.headers);
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api/");

  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    try {
      const decoded = authService.verifyAccessToken(token);
      requestHeaders.set("x-user-id", decoded.sub);
      requestHeaders.set("x-user-role", decoded.role);
      requestHeaders.set("x-user-name", decoded.name);
    } catch {
      requestHeaders.delete("authorization");
    }
  }

  if (isApi) {
    const origin = req.headers.get("origin") ?? "*";
    const allowHeaders =
      req.headers.get("access-control-request-headers") ?? "Content-Type, Authorization";

    const corsHeaders = {
      "Access-Control-Allow-Origin": origin,
      Vary: "Origin",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": allowHeaders,
      "Access-Control-Max-Age": "86400",
    } as const;

    if (req.method === "OPTIONS") {
      return new NextResponse(null, { status: 204, headers: corsHeaders });
    }

    const response = NextResponse.next({ request: { headers: requestHeaders } });

    const rid =
      (typeof crypto !== "undefined" && "randomUUID" in crypto && crypto.randomUUID()) ||
      Math.random().toString(36).slice(2);
    response.headers.set("x-request-id", rid);

    for (const [k, v] of Object.entries(corsHeaders)) {
      response.headers.set(k, v);
    }

    return response;
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  // Attach a lightweight request ID for tracing
  const rid =
    (typeof crypto !== "undefined" && "randomUUID" in crypto && crypto.randomUUID()) ||
    Math.random().toString(36).slice(2);
  response.headers.set("x-request-id", rid);
  return response;
}

export const config = {
  // Run for all API routes + all HTML pages (skips Next static assets)
  matcher: ["/api/:path*", "/((?!_next/static|_next/image|favicon.ico).*)"],
};
