import { NextRequest, NextResponse } from "next/server";

import { updateParentMeeting } from "@/lib/parent-service";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const meeting = updateParentMeeting(params.id, {
      agenda: body?.agenda,
      scheduledFor: body?.scheduledFor,
      status: body?.status,
      location: body?.location,
      notes: body?.notes,
    });
    return NextResponse.json(meeting);
  } catch (error: any) {
    console.error("Failed to update parent meeting", error);
    return NextResponse.json({ error: error?.message ?? "Unable to update meeting." }, { status: 400 });
  }
}
