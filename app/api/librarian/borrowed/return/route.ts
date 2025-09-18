import { NextResponse } from "next/server"

import { markBorrowedBookReturned } from "@/lib/librarian-service"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    const { borrowId } = payload ?? {}

    if (!borrowId || typeof borrowId !== "string") {
      return NextResponse.json({ error: "borrowId is required." }, { status: 400 })
    }

    const record = await markBorrowedBookReturned(borrowId)
    if (!record) {
      return NextResponse.json({ error: "Borrow record not found." }, { status: 404 })
    }

    return NextResponse.json({ record })
  } catch (error) {
    console.error("Failed to mark book as returned", error)
    return NextResponse.json({ error: "Failed to mark book as returned." }, { status: 500 })
  }
}
