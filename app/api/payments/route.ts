import { NextRequest, NextResponse } from "next/server"

import { listPayments, type PaymentStatus } from "@/lib/payments-store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const statusParam = request.nextUrl.searchParams.get("status")
    const status =
      statusParam && ["pending", "paid", "failed"].includes(statusParam)
        ? (statusParam as PaymentStatus)
        : undefined

    const payments = listPayments(status)
    return NextResponse.json(payments, { status: 200 })
  } catch (error) {
    console.error("Payments fetch error:", error)
    return NextResponse.json({ error: "Failed to load payments" }, { status: 500 })
  }
}
