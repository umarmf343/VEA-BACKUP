import { NextResponse } from "next/server";

import { listStudentNotifications } from "@/lib/student-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const notifications = listStudentNotifications();
    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("Failed to load student notifications", error);
    return NextResponse.json({ error: "Failed to load notifications." }, { status: 500 });
  }
}
