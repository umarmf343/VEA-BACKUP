import { NextResponse } from "next/server"

import { getLibraryState } from "@/lib/librarian-service"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const { requests } = await getLibraryState()
    return NextResponse.json({ requests })
  } catch (error) {
    console.error("Failed to load book requests", error)
    return NextResponse.json({ error: "Failed to load requests." }, { status: 500 })
  }
}
