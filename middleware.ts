// middleware.ts
// Purpose: Provide safe defaults for API requests (CORS + preflight) and add a request ID.
// Notes:
// - Applies CORS headers to /api/* routes.
// - Handles OPTIONS preflight with a 204 response.
// - Adds an x-request-id header to all responses for easier debugging.
// - Does NOT enforce auth here; plug in role checks later if needed.

import { NextResponse, type NextRequest } from "next/server";

const RAW_ALLOWED_ORIGINS = process.env.CORS_ALLOWED_ORIGINS ?? "";
const DEFAULT_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL,
  process.env.APP_URL,
  process.env.API_BASE_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  process.env.NODE_ENV !== "production" ? "http://localhost:3000" : undefined,
];

const parsedOrigins = RAW_ALLOWED_ORIGINS.split(/[,\s]+/)
  .map((value) => value.trim())
  .filter(Boolean);

const ORIGINS_SET = (() => {
  const set = new Set<string>();
  for (const value of [...parsedOrigins, ...DEFAULT_ORIGINS]) {
    if (!value) continue;
    if (value === "*") {
      return new Set<string>(["*"]);
    }
    set.add(value);
  }
  return set;
})();

const ALLOW_ALL_ORIGINS = ORIGINS_SET.has("*");
const FIRST_ALLOWED_ORIGIN = (() => {
  if (ALLOW_ALL_ORIGINS) {
    return "*";
  }
  const iterator = ORIGINS_SET.values().next();
  return iterator.done ? null : iterator.value;
})();

const ALLOW_CREDENTIALS = process.env.CORS_ALLOW_CREDENTIALS === "true";

function resolveAllowedOrigin(requestOrigin: string | null): string | null {
  if (ALLOW_ALL_ORIGINS) {
    return requestOrigin ?? "*";
  }
  if (!requestOrigin) {
    return FIRST_ALLOWED_ORIGIN;
  }
  return ORIGINS_SET.has(requestOrigin) ? requestOrigin : null;
}

export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Attach a lightweight request ID for tracing
  const rid =
    (typeof crypto !== "undefined" && "randomUUID" in crypto && crypto.randomUUID()) ||
    Math.random().toString(36).slice(2);
  res.headers.set("x-request-id", rid);

  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api/");

  if (isApi) {
    const requestOrigin = req.headers.get("origin");
    const allowedOrigin = resolveAllowedOrigin(requestOrigin);

    if (!allowedOrigin) {
      if (req.method === "OPTIONS") {
        return new NextResponse(null, { status: 403 });
      }
      return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
    }

    const allowHeaders =
      req.headers.get("access-control-request-headers") ?? "Content-Type, Authorization";

    const corsHeaders: Record<string, string> = {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": allowHeaders,
      "Access-Control-Max-Age": "86400",
    };

    if (allowedOrigin !== "*") {
      corsHeaders.Vary = "Origin";
    }

    if (ALLOW_CREDENTIALS && allowedOrigin !== "*") {
      corsHeaders["Access-Control-Allow-Credentials"] = "true";
    }

    // Preflight
    if (req.method === "OPTIONS") {
      return new NextResponse(null, { status: 204, headers: corsHeaders });
    }

    // Apply CORS to actual API responses
    for (const [k, v] of Object.entries(corsHeaders)) {
      res.headers.set(k, v);
    }
  }

  return res;
}

export const config = {
  // Run for all API routes + all HTML pages (skips Next static assets)
  matcher: ["/api/:path*", "/((?!_next/static|_next/image|favicon.ico).*)"],
};
