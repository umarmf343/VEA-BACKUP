import { NextRequest, NextResponse } from "next/server"

import { listAccountantReceipts } from "@/lib/accountant-service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams
    const studentId = params.get("studentId")?.trim()
    const paymentId = params.get("paymentId")?.trim()

    const receipts = await listAccountantReceipts()
    const filtered = receipts.filter((receipt) => {
      if (studentId && receipt.issuedTo !== studentId) {
        return false
      }

      if (paymentId && receipt.paymentId !== paymentId) {
        return false
      }

      return true
    })

    return NextResponse.json({ receipts: filtered })
  } catch (error) {
    console.error("Failed to load accountant receipts", error)
    return NextResponse.json({ error: "Unable to load receipts." }, { status: 500 })
  }
}
