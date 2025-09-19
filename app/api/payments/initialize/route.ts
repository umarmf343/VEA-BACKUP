import { randomUUID } from "crypto"
import { NextResponse } from "next/server"

import { PAYMENT_STATUS, appendPayment } from "@/lib/payments-store"
import {
  PAYMENT_INITIALIZE_RATE_LIMIT,
  evaluateInitializeRateLimit,
  pruneInitializeRateEntries,
  registerInitializeAttempt,
} from "@/lib/payments-initialize-rate-limit"

export const runtime = "nodejs"

function getClientIp(request: Request) {
  const forwarded = request.headers?.get("x-forwarded-for")
  const realIp = request.headers?.get("x-real-ip")
  const candidate = forwarded?.split(",")[0] ?? realIp
  return candidate?.trim() || "unknown"
}

function secondsFromMs(ms: number | undefined) {
  if (!ms || ms <= 0) {
    return "1"
  }
  return String(Math.max(1, Math.ceil(ms / 1000)))
}

export async function POST(request: Request) {
  const now = Date.now()
  const ip = getClientIp(request)

  try {
    pruneInitializeRateEntries(now)
    const status = evaluateInitializeRateLimit(ip, now)
    if (status.blocked) {
      return NextResponse.json(
        { error: "Too many payment initialization attempts. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": secondsFromMs(status.retryAfterMs) },
        },
      )
    }

    registerInitializeAttempt(ip, now)

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
