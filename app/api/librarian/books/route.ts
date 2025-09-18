import { NextResponse } from "next/server"

import { createLibraryBook, getLibraryState } from "@/lib/librarian-service"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const { books } = await getLibraryState()
    return NextResponse.json({ books })
  } catch (error) {
    console.error("Failed to load library books", error)
    return NextResponse.json({ error: "Failed to load library books." }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    const { title, author, category, copies, isbn, addedBy } = payload ?? {}

    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "title is required." }, { status: 400 })
    }
    if (!author || typeof author !== "string") {
      return NextResponse.json({ error: "author is required." }, { status: 400 })
    }
    if (!category || typeof category !== "string") {
      return NextResponse.json({ error: "category is required." }, { status: 400 })
    }

    const numericCopies = Number.parseInt(String(copies ?? ""), 10)
    const safeCopies = Number.isFinite(numericCopies) && numericCopies > 0 ? numericCopies : 1

    const book = await createLibraryBook({
      title: title.trim(),
      author: author.trim(),
      category: category.trim(),
      copies: safeCopies,
      isbn: typeof isbn === "string" && isbn.trim() ? isbn.trim() : undefined,
      addedBy: typeof addedBy === "string" && addedBy.trim() ? addedBy.trim() : undefined,
    })

    return NextResponse.json({ book }, { status: 201 })
  } catch (error) {
    console.error("Failed to create library book", error)
    return NextResponse.json({ error: "Failed to add book." }, { status: 500 })
  }
}
