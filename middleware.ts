// middleware.ts
// Purpose: Provide safe defaults for API requests (CORS + preflight) and add a request ID.
// Notes:
// - Applies CORS headers to /api/* routes.
// - Handles OPTIONS preflight with a 204 response.
// - Adds an x-request-id header to all responses for easier debugging.
// - Validates bearer tokens with an Edge-compatible verifier so we can run on the Edge runtime.

import { NextResponse, type NextRequest } from "next/server"

import { EdgeAuthError, verifyAccessToken } from "@/lib/edge-auth"

const PUBLIC_API_PATHS = [/^\/api\/auth\/login$/]

function isPublicApiPath(pathname: string) {
  return PUBLIC_API_PATHS.some((pattern) => pattern.test(pathname))
}

function generateRequestId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    try {
      return crypto.randomUUID()
    } catch {
      /* fall through */
    }
  }

  return Math.random().toString(36).slice(2)
}

function buildCorsHeaders(req: NextRequest) {
  const origin = req.headers.get("origin") ?? "*"
  const allowHeaders =
    req.headers.get("access-control-request-headers") ?? "Content-Type, Authorization"

  return {
    "Access-Control-Allow-Origin": origin,
    Vary: "Origin",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": allowHeaders,
    "Access-Control-Max-Age": "86400",
  } as const
}

function applyHeaders(response: NextResponse, headers: Record<string, string> | undefined) {
  if (!headers) return response
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value)
  }
  return response
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isApiRoute = pathname.startsWith("/api/")
  const requiresAuth = isApiRoute && !isPublicApiPath(pathname)
  const corsHeaders = isApiRoute ? buildCorsHeaders(req) : undefined
  const requestHeaders = new Headers(req.headers)

  const authHeader = req.headers.get("authorization")
  const hasBearerToken = authHeader?.startsWith("Bearer ") ?? false

  if (isApiRoute && req.method === "OPTIONS") {
    const response = applyHeaders(new NextResponse(null, { status: 204 }), corsHeaders)
    response.headers.set("x-request-id", generateRequestId())
    return response
  }

  if (!hasBearerToken && requiresAuth) {
    const response = applyHeaders(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      corsHeaders,
    )
    response.headers.set("x-request-id", generateRequestId())
    return response
  }

  if (hasBearerToken) {
    const token = authHeader!.slice(7).trim()
    if (!token) {
      const response = applyHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        corsHeaders,
      )
      response.headers.set("x-request-id", generateRequestId())
      return response
    }

    try {
      const decoded = await verifyAccessToken(token)

      requestHeaders.set("x-user-id", decoded.sub)
      requestHeaders.set("x-user-role", decoded.role)
      requestHeaders.set("x-user-name", decoded.name)
      requestHeaders.set("x-user-email", decoded.email)
    } catch (error) {
      const status = error instanceof EdgeAuthError ? error.status : 500
      const message = error instanceof EdgeAuthError ? error.message : "Internal server error"
      const response = applyHeaders(NextResponse.json({ error: message }, { status }), corsHeaders)
      response.headers.set("x-request-id", generateRequestId())
      return response
    }
  }

  if (isApiRoute) {
    const response = applyHeaders(
      NextResponse.next({ request: { headers: requestHeaders } }),
      corsHeaders,
    )
    response.headers.set("x-request-id", generateRequestId())
    return response
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set("x-request-id", generateRequestId())
  return response
}

export const config = {
  // Run for all API routes + all HTML pages (skips Next static assets)
  matcher: ["/api/:path*", "/((?!_next/static|_next/image|favicon.ico).*)"],
}
