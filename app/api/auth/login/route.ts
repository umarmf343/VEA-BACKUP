import { NextResponse } from "next/server"

import { getUserByEmail } from "@/lib/database"
import {
  LOCKOUT_DURATION_MS,
  MAX_FAILED_ATTEMPTS,
  checkAccountLock,
  recordFailedLogin,
  recordSuccessfulLogin,
  resetAuthThrottles,
} from "@/lib/auth-service"
import { generateToken, sanitizeInput, verifyPassword } from "@/lib/security"
import { readPersistentState, writePersistentState } from "@/lib/persistent-state"

export const runtime = "nodejs"

export const LOGIN_THROTTLE_LIMITS = {
  ip: { windowMs: 10 * 60 * 1000, max: 10 },
  username: { windowMs: LOCKOUT_DURATION_MS, max: MAX_FAILED_ATTEMPTS },
}

type RateEntry = {
  count: number
  firstAttemptAt: number
}

const IP_ATTEMPTS_STORE_KEY = "auth.login.ipAttempts"

let ipAttemptsStore: Record<string, RateEntry> | null = null

function getIpAttemptsStore() {
  if (!ipAttemptsStore) {
    ipAttemptsStore = readPersistentState<Record<string, RateEntry>>(IP_ATTEMPTS_STORE_KEY, () => ({}))
  }
  return ipAttemptsStore
}

function persistIpAttempts() {
  if (ipAttemptsStore) {
    writePersistentState(IP_ATTEMPTS_STORE_KEY, ipAttemptsStore)
  }
}

function normalizeEmail(email: string) {
  return sanitizeInput(email).toLowerCase()
}

function getClientIp(request: Request) {
  const header = request.headers?.get("x-forwarded-for") || request.headers?.get("x-real-ip")
  if (!header) {
    return "unknown"
  }
  return header.split(",")[0]?.trim() || "unknown"
}

function evaluateIpLimit(ip: string, now: number) {
  const limit = LOGIN_THROTTLE_LIMITS.ip
  const store = getIpAttemptsStore()
  const entry = store[ip]
  if (!entry) {
    return { blocked: false as const }
  }
  const elapsed = now - entry.firstAttemptAt
  if (elapsed > limit.windowMs) {
    delete store[ip]
    persistIpAttempts()
    return { blocked: false as const }
  }
  if (entry.count >= limit.max) {
    return { blocked: true as const, retryAfterMs: limit.windowMs - elapsed }
  }
  return { blocked: false as const }
}

function registerIpAttempt(ip: string, now: number) {
  const limit = LOGIN_THROTTLE_LIMITS.ip
  const store = getIpAttemptsStore()
  const entry = store[ip]
  if (!entry || now - entry.firstAttemptAt > limit.windowMs) {
    store[ip] = { count: 1, firstAttemptAt: now }
    persistIpAttempts()
    return
  }
  entry.count += 1
  persistIpAttempts()
}

function clearIpAttempts(ip: string) {
  const store = getIpAttemptsStore()
  if (store[ip]) {
    delete store[ip]
    persistIpAttempts()
  }
}

function secondsFromMs(ms: number | undefined) {
  if (!ms || ms <= 0) {
    return "1"
  }
  return String(Math.max(1, Math.ceil(ms / 1000)))
}

export function resetLoginThrottling() {
  ipAttemptsStore = {}
  persistIpAttempts()
  ipAttemptsStore = null
  resetAuthThrottles()
}

function createLockoutResponse(message: string, retryAfterMs: number) {
  const headers = new Headers({ "Retry-After": secondsFromMs(retryAfterMs) })
  return NextResponse.json({ error: message }, { status: 429, headers })
}

export async function POST(request: Request) {
  const now = Date.now()
  const ip = getClientIp(request)

  try {
    const ipStatus = evaluateIpLimit(ip, now)
    if (ipStatus.blocked) {
      return createLockoutResponse(
        "Too many login attempts from this IP. Please try again later.",
        ipStatus.retryAfterMs ?? LOGIN_THROTTLE_LIMITS.ip.windowMs,
      )
    }

    let body: { email?: string; password?: string } | null = null
    try {
      body = (await request.json()) as { email?: string; password?: string }
    } catch {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    const email = normalizeEmail(body?.email ?? "")
    const password = sanitizeInput(body?.password ?? "")

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    const accountStatus = checkAccountLock(email, now)
    if (accountStatus.locked) {
      return createLockoutResponse(
        "Account temporarily locked due to too many failed attempts.",
        accountStatus.retryAfterMs ?? LOCKOUT_DURATION_MS,
      )
    }

    const user = await getUserByEmail(email)

    if (!user || !user.passwordHash) {
      registerIpAttempt(ip, now)
      const failure = recordFailedLogin(email, now)
      if (failure.locked) {
        return createLockoutResponse(
          "Account temporarily locked due to too many failed attempts.",
          failure.retryAfterMs ?? LOCKOUT_DURATION_MS,
        )
      }
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const isValid = await verifyPassword(password, user.passwordHash)
    if (!isValid) {
      registerIpAttempt(ip, now)
      const failure = recordFailedLogin(email, now)
      if (failure.locked) {
        return createLockoutResponse(
          "Account temporarily locked due to too many failed attempts.",
          failure.retryAfterMs ?? LOCKOUT_DURATION_MS,
        )
      }
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    recordSuccessfulLogin(email)
    clearIpAttempts(ip)

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
      token,
      message: "Login successful",
    })
  } catch (error) {
    console.error("Login error:", error)
    registerIpAttempt(ip, now)
    return NextResponse.json({ error: "Unable to process login" }, { status: 500 })
  }
}
