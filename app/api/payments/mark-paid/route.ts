import { NextRequest, NextResponse } from "next/server"

import { recordPaymentSettlementActivity } from "@/lib/admin-service"
import { markPaymentAsPaid } from "@/lib/payments-store"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { id?: string }
    if (!body?.id) {
      return NextResponse.json({ error: "Payment id is required" }, { status: 400 })
    }

    const { payment, wasPreviouslyVerified } = markPaymentAsPaid(body.id)
    recordPaymentSettlementActivity({
      paymentId: payment.id,
      amount: payment.amount,
      studentId: payment.studentId,
      reference: payment.reference,
      wasPreviouslyVerified,
    })

    return NextResponse.json({ payment })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to mark payment as paid"

    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
    }

    if (message === "Payment not found") {
      return NextResponse.json({ error: message }, { status: 404 })
    }

    console.error("Payment settlement error:", error)
    return NextResponse.json({ error: "Failed to mark payment as paid" }, { status: 500 })
  }
}
