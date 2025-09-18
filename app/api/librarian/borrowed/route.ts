import { NextResponse } from "next/server"

import { getLibraryState } from "@/lib/librarian-service"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const { borrowed } = await getLibraryState()
    return NextResponse.json({ borrowed })
  } catch (error) {
    console.error("Failed to load borrowed books", error)
    return NextResponse.json({ error: "Failed to load borrowed books." }, { status: 500 })
  }
}
