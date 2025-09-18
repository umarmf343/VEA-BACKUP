import { NextResponse } from "next/server";

import { updateTeacherMessage } from "@/lib/teacher-service";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const messageId = params.id;
    if (!messageId) {
      return NextResponse.json({ error: "Message id is required." }, { status: 400 });
    }

    const payload = await request.json();
    const updates: Record<string, unknown> = payload ?? {};

    const result = await updateTeacherMessage(messageId, {
      read: typeof updates.read === "boolean" ? updates.read : undefined,
      archived: typeof updates.archived === "boolean" ? updates.archived : undefined,
    });

    if (!result) {
      return NextResponse.json({ error: "Message not found." }, { status: 404 });
    }

    return NextResponse.json({ message: result });
  } catch (error) {
    console.error("Failed to update teacher message", error);
    return NextResponse.json({ error: "Failed to update message." }, { status: 500 });
  }
}
