import { NextRequest, NextResponse } from "next/server"

import { markPaymentVerificationActivity } from "@/lib/admin-service"
import { verifyPayment } from "@/lib/payments-store"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
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
