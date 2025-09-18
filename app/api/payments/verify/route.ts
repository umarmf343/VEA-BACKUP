import { NextResponse } from "next/server"

import { markPaymentVerificationActivity } from "@/lib/admin-service"
import { verifyPayment } from "@/lib/payments-store"
import { readPersistentState, resetPersistentState, writePersistentState } from "@/lib/persistent-state"

export const runtime = "nodejs"

export const PAYMENT_VERIFY_RATE_LIMIT = {
  windowMs: 60 * 1000,
  max: 10,
}

type RateEntry = {
  count: number
  firstRequestAt: number
}

const RATE_LIMIT_STORE_KEY = "payments.verify.rateLimit"

let verifyRateState: Record<string, RateEntry> | null = null

function getVerifyRateState() {
  if (!verifyRateState) {
    verifyRateState = readPersistentState<Record<string, RateEntry>>(RATE_LIMIT_STORE_KEY, () => ({}))
  }
  return verifyRateState
}

function persistVerifyRateState() {
  if (verifyRateState) {
    writePersistentState(RATE_LIMIT_STORE_KEY, verifyRateState)
  }
}

function getClientIp(request: Request) {
  const forwarded = request.headers?.get("x-forwarded-for")
  const realIp = request.headers?.get("x-real-ip")
  const candidate = forwarded?.split(",")[0] ?? realIp
  return candidate?.trim() || "unknown"
}

function evaluateRateLimit(ip: string, now: number) {
  const store = getVerifyRateState()
  const entry = store[ip]
  if (!entry) {
    return { blocked: false as const }
  }
  const elapsed = now - entry.firstRequestAt
  if (elapsed > PAYMENT_VERIFY_RATE_LIMIT.windowMs) {
    delete store[ip]
    persistVerifyRateState()
    return { blocked: false as const }
  }
  if (entry.count >= PAYMENT_VERIFY_RATE_LIMIT.max) {
    return { blocked: true as const, retryAfterMs: PAYMENT_VERIFY_RATE_LIMIT.windowMs - elapsed }
  }
  return { blocked: false as const }
}

function registerAttempt(ip: string, now: number) {
  const store = getVerifyRateState()
  const entry = store[ip]
  if (!entry || now - entry.firstRequestAt > PAYMENT_VERIFY_RATE_LIMIT.windowMs) {
    store[ip] = { count: 1, firstRequestAt: now }
    persistVerifyRateState()
    return
  }
  entry.count += 1
  persistVerifyRateState()
}

function secondsFromMs(ms: number | undefined) {
  if (!ms || ms <= 0) {
    return "1"
  }
  return String(Math.max(1, Math.ceil(ms / 1000)))
}

function pruneVerifyEntries(now: number) {
  const store = getVerifyRateState()
  let dirty = false
  for (const [ip, entry] of Object.entries(store)) {
    if (now - entry.firstRequestAt > PAYMENT_VERIFY_RATE_LIMIT.windowMs) {
      delete store[ip]
      dirty = true
    }
  }
  if (dirty) {
    persistVerifyRateState()
  }
}

export function resetVerifyRateLimit() {
  verifyRateState = null
  resetPersistentState(RATE_LIMIT_STORE_KEY)
}

export async function POST(request: Request) {
  const now = Date.now()
  const ip = getClientIp(request)

  try {
    pruneVerifyEntries(now)
    const status = evaluateRateLimit(ip, now)
    if (status.blocked) {
      return NextResponse.json(
        { error: "Too many verification attempts. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": secondsFromMs(status.retryAfterMs) },
        },
      )
    }

    registerAttempt(ip, now)

    const body = (await request.json()) as { id?: string }
    if (!body?.id) {
      return NextResponse.json({ error: "Payment id is required" }, { status: 400 })
    }

    const payment = verifyPayment(body.id)
    markPaymentVerificationActivity({
      paymentId: payment.id,
      amount: payment.amount,
      studentId: payment.studentId,
      reference: payment.reference,
    })

    return NextResponse.json({ payment })
  } catch (error) {
    console.error("Payment verification error:", error)
    const message = error instanceof Error ? error.message : "Failed to verify payment"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
