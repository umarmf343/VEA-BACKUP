import { NextResponse } from "next/server";

import { listTeacherNotifications } from "@/lib/teacher-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const notifications = await listTeacherNotifications();
    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("Failed to load teacher notifications", error);
    return NextResponse.json({ error: "Failed to load notifications." }, { status: 500 });
  }
}
