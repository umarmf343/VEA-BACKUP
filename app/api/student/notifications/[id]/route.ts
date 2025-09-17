import { NextResponse } from "next/server";

import { updateStudentNotification } from "@/lib/student-service";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const id = params?.id;
  if (!id) {
    return NextResponse.json({ error: "Notification id is required." }, { status: 400 });
  }

  try {
    const payload = await request.json().catch(() => ({}));
    const { read, archived } = payload ?? {};
    const notification = updateStudentNotification(id, { read, archived });
    return NextResponse.json({ notification });
  } catch (error) {
    console.error(`Failed to update student notification ${id}`, error);
    const message = error instanceof Error ? error.message : "Failed to update notification.";
    const statusCode = /not found/i.test(message) ? 404 : 500;
    return NextResponse.json({ error: message || "Failed to update notification." }, { status: statusCode });
  }
}
