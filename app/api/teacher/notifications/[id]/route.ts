import { NextResponse } from "next/server";

import { updateTeacherNotification } from "@/lib/teacher-service";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const notificationId = params.id;
    if (!notificationId) {
      return NextResponse.json({ error: "Notification id is required." }, { status: 400 });
    }

    const payload = await request.json();
    const updates: Record<string, unknown> = payload ?? {};

    const result = updateTeacherNotification(notificationId, {
      read: typeof updates.read === "boolean" ? updates.read : undefined,
      acknowledgedAt: typeof updates.acknowledgedAt === "string" ? updates.acknowledgedAt : undefined,
    });

    if (!result) {
      return NextResponse.json({ error: "Notification not found." }, { status: 404 });
    }

    return NextResponse.json({ notification: result });
  } catch (error) {
    console.error("Failed to update teacher notification", error);
    return NextResponse.json({ error: "Failed to update notification." }, { status: 500 });
  }
}
