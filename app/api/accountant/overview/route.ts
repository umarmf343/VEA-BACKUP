import { NextResponse } from "next/server"

import { getAccountantFinancialSnapshot } from "@/lib/accountant-service"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const snapshot = await getAccountantFinancialSnapshot()
    return NextResponse.json(snapshot)
  } catch (error) {
    console.error("Failed to load accountant overview", error)
    return NextResponse.json({ error: "Unable to load accountant overview." }, { status: 500 })
  }
}
