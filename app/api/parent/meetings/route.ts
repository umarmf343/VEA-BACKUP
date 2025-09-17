import { NextRequest, NextResponse } from "next/server";

import { listParentMeetings, scheduleParentMeeting } from "@/lib/parent-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const meetings = listParentMeetings();
    return NextResponse.json({ meetings });
  } catch (error) {
    console.error("Failed to load parent meetings", error);
    return NextResponse.json({ error: "Unable to load meetings." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const meeting = scheduleParentMeeting({
      studentId: body?.studentId,
      staffName: body?.staffName,
      staffRole: body?.staffRole,
      agenda: body?.agenda,
      scheduledFor: body?.scheduledFor,
      location: body?.location ?? "virtual",
    });
    return NextResponse.json(meeting, { status: 201 });
  } catch (error: any) {
    console.error("Failed to schedule parent meeting", error);
    return NextResponse.json({ error: error?.message ?? "Unable to schedule meeting." }, { status: 400 });
  }
}
