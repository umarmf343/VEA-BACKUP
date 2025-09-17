import { NextResponse } from "next/server";

import { listStudentSchedule } from "@/lib/student-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const schedule = listStudentSchedule();
    return NextResponse.json({ schedule });
  } catch (error) {
    console.error("Failed to load student schedule", error);
    return NextResponse.json({ error: "Failed to load schedule." }, { status: 500 });
  }
}
