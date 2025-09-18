import { NextResponse } from "next/server"

import { buildLibrarySnapshot, getLibraryState } from "@/lib/librarian-service"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const state = await getLibraryState()
    const snapshot = buildLibrarySnapshot(state)
    return NextResponse.json({ snapshot })
  } catch (error) {
    console.error("Failed to load library snapshot", error)
    return NextResponse.json({ error: "Failed to load library overview." }, { status: 500 })
  }
}
