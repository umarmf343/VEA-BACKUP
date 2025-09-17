import { NextRequest, NextResponse } from "next/server";

import { listParentAttendance } from "@/lib/parent-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId") ?? undefined;
    const attendance = listParentAttendance(studentId ?? undefined);
    return NextResponse.json({ attendance });
  } catch (error) {
    console.error("Failed to load parent attendance", error);
    return NextResponse.json({ error: "Unable to load attendance." }, { status: 500 });
  }
}
