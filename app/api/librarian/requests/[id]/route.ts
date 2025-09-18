import { NextResponse } from "next/server"

import { updateBookRequestStatus } from "@/lib/librarian-service"

export const dynamic = "force-dynamic"

export async function PATCH(request: Request, context: { params: { id: string } }) {
  try {
    const { id } = context.params
    const payload = await request.json()
    const { status, actorId } = payload ?? {}

    if (status !== "approved" && status !== "rejected") {
      return NextResponse.json({ error: "status must be 'approved' or 'rejected'." }, { status: 400 })
    }

    const actor = typeof actorId === "string" && actorId.trim() ? actorId.trim() : "usr-librarian-1"
    const updated = await updateBookRequestStatus(id, status, actor)

    return NextResponse.json({ request: updated })
  } catch (error) {
    console.error("Failed to update book request", error)
    return NextResponse.json({ error: "Failed to update request." }, { status: 500 })
  }
}
