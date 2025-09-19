import { NextResponse } from "next/server"

import { markPaymentVerificationActivity } from "@/lib/admin-service"
import { verifyPayment } from "@/lib/payments-store"
import {
  PAYMENT_VERIFY_RATE_LIMIT,
  evaluateVerifyRateLimit,
  pruneVerifyRateEntries,
  registerVerifyAttempt,
} from "@/lib/payments-verify-rate-limit"

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
    pruneVerifyRateEntries(now)
    const status = evaluateVerifyRateLimit(ip, now)
    if (status.blocked) {
      return NextResponse.json(
        { error: "Too many verification attempts. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": secondsFromMs(status.retryAfterMs) },
        },
      )
    }

    registerVerifyAttempt(ip, now)

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
