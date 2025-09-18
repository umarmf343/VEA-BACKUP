import { NextResponse } from "next/server";

import { getStudentWorkspaceSnapshot, type StudentAttendanceRecord } from "@/lib/student-service";

export const dynamic = "force-dynamic";

function calculateAttendanceAverage(attendance: StudentAttendanceRecord[]) {
  if (!attendance.length) {
    return 0;
  }

  const total = attendance.reduce((sum, record) => sum + (record.attendanceRate ?? 0), 0);
  return total / attendance.length;
}

export async function GET() {
  try {
    const snapshot = getStudentWorkspaceSnapshot();
    const attendanceAverage = calculateAttendanceAverage(snapshot.attendance);
    const creditsRemaining = Math.max(snapshot.profile.creditsRequired - snapshot.profile.creditsCompleted, 0);

    return NextResponse.json({
      ...snapshot,
      attendanceAverage,
      creditsRemaining,
    });
  } catch (error) {
    console.error("Failed to load student overview", error);
    return NextResponse.json({ error: "Failed to load student overview." }, { status: 500 });
  }
}
