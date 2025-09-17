import { NextResponse } from "next/server";

import { listStudentAttendance } from "@/lib/student-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const attendance = listStudentAttendance();
    return NextResponse.json({ attendance });
  } catch (error) {
    console.error("Failed to load student attendance", error);
    return NextResponse.json({ error: "Failed to load attendance." }, { status: 500 });
  }
}
