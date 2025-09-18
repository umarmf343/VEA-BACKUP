import { NextRequest, NextResponse } from "next/server"

import { generateAccountantReport } from "@/lib/accountant-service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { type?: unknown }
    const type = typeof body.type === "string" ? body.type.trim() : ""

    if (!type) {
      return NextResponse.json({ error: "Report type is required." }, { status: 400 })
    }

    const report = await generateAccountantReport(type)

    return NextResponse.json({ report }, { status: 201 })
  } catch (error) {
    console.error("Failed to generate accountant report", error)
    return NextResponse.json({ error: "Unable to generate report." }, { status: 500 })
  }
}
