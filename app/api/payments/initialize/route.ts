import { randomUUID } from "crypto"
import { NextResponse } from "next/server"

import { PAYMENT_STATUS, appendPayment } from "@/lib/payments-store"
import { readPersistentState, resetPersistentState, writePersistentState } from "@/lib/persistent-state"

export const runtime = "nodejs"

export const PAYMENT_INITIALIZE_RATE_LIMIT = {
  windowMs: 60 * 1000,
  max: 5,
}

type RateEntry = {
  count: number
  firstRequestAt: number
}

const RATE_LIMIT_STORE_KEY = "payments.initialize.rateLimit"

let rateState: Record<string, RateEntry> | null = null

function getRateState() {
  if (!rateState) {
    rateState = readPersistentState<Record<string, RateEntry>>(RATE_LIMIT_STORE_KEY, () => ({}))
  }
  return rateState
}

function persistRateState() {
  if (rateState) {
    writePersistentState(RATE_LIMIT_STORE_KEY, rateState)
  }
}

function getClientIp(request: Request) {
  const forwarded = request.headers?.get("x-forwarded-for")
  const realIp = request.headers?.get("x-real-ip")
  const candidate = forwarded?.split(",")[0] ?? realIp
  return candidate?.trim() || "unknown"
}

function evaluateRateLimit(ip: string, now: number) {
  const store = getRateState()
  const entry = store[ip]
  if (!entry) {
    return { blocked: false as const }
  }
  const elapsed = now - entry.firstRequestAt
  if (elapsed > PAYMENT_INITIALIZE_RATE_LIMIT.windowMs) {
    delete store[ip]
    persistRateState()
    return { blocked: false as const }
  }
  if (entry.count >= PAYMENT_INITIALIZE_RATE_LIMIT.max) {
    return { blocked: true as const, retryAfterMs: PAYMENT_INITIALIZE_RATE_LIMIT.windowMs - elapsed }
  }
  return { blocked: false as const }
}

function registerAttempt(ip: string, now: number) {
  const store = getRateState()
  const entry = store[ip]
  if (!entry || now - entry.firstRequestAt > PAYMENT_INITIALIZE_RATE_LIMIT.windowMs) {
    store[ip] = { count: 1, firstRequestAt: now }
    persistRateState()
    return
  }
  entry.count += 1
  persistRateState()
}

function secondsFromMs(ms: number | undefined) {
  if (!ms || ms <= 0) {
    return "1"
  }
  return String(Math.max(1, Math.ceil(ms / 1000)))
}

function pruneExpiredEntries(now: number) {
  const store = getRateState()
  let dirty = false
  for (const [ip, entry] of Object.entries(store)) {
    if (now - entry.firstRequestAt > PAYMENT_INITIALIZE_RATE_LIMIT.windowMs) {
      delete store[ip]
      dirty = true
    }
  }
  if (dirty) {
    persistRateState()
  }
}

export function resetInitializeRateLimit() {
  rateState = null
  resetPersistentState(RATE_LIMIT_STORE_KEY)
}

export async function POST(request: Request) {
  const now = Date.now()
  const ip = getClientIp(request)

  try {
    pruneExpiredEntries(now)
    const status = evaluateRateLimit(ip, now)
    if (status.blocked) {
      return NextResponse.json(
        { error: "Too many payment initialization attempts. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": secondsFromMs(status.retryAfterMs) },
        },
      )
    }

    registerAttempt(ip, now)

    const payload = (await request.json().catch(() => null)) as
      | { studentId?: unknown; amount?: unknown }
      | null

    const studentId = typeof payload?.studentId === "string" ? payload.studentId.trim() : ""
    const amount = typeof payload?.amount === "number" ? payload.amount : Number(payload?.amount)

    if (!studentId || !Number.isFinite(amount) || amount < 100) {
      return NextResponse.json(
        { message: "Invalid payload" },
        { status: 400 },
      )
    }

    const reference = `DEV-${randomUUID().replace(/[^a-zA-Z0-9]/g, "").slice(0, 12).toLowerCase()}`
    const authorizationUrl = `https://paystack.com/pay/dev-${reference}`

    appendPayment({
      id: reference,
      studentId,
      amount,
      status: PAYMENT_STATUS.pending,
      createdAt: new Date(now).toISOString(),
      reference,
    })

    return NextResponse.json({
      authorization_url: authorizationUrl,
      reference,
      status: "pending",
      message: "Payment initialized successfully",
    })
  } catch (error) {
    console.error("Payment initialization error:", error)
    return NextResponse.json({ error: "Failed to initialize payment" }, { status: 500 })
  }
}
