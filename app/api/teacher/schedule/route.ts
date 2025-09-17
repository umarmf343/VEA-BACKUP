import { NextResponse } from "next/server";

import { addTeacherScheduleItem, listTeacherSchedule } from "@/lib/teacher-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const schedule = listTeacherSchedule();
    return NextResponse.json({ schedule });
  } catch (error) {
    console.error("Failed to load teacher schedule", error);
    return NextResponse.json({ error: "Failed to load schedule." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { title, type, startTime, endTime, location, classId, notes } = payload ?? {};

    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "title is required." }, { status: 400 });
    }
    if (!type || typeof type !== "string") {
      return NextResponse.json({ error: "type is required." }, { status: 400 });
    }
    if (!startTime || typeof startTime !== "string") {
      return NextResponse.json({ error: "startTime is required." }, { status: 400 });
    }
    if (!endTime || typeof endTime !== "string") {
      return NextResponse.json({ error: "endTime is required." }, { status: 400 });
    }
    if (!location || typeof location !== "string") {
      return NextResponse.json({ error: "location is required." }, { status: 400 });
    }

    const item = addTeacherScheduleItem({
      title: title.trim(),
      type: type,
      startTime,
      endTime,
      location: location.trim(),
      classId: classId ? String(classId) : undefined,
      notes: typeof notes === "string" ? notes : undefined,
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error("Failed to create teacher schedule item", error);
    return NextResponse.json({ error: "Failed to create schedule item." }, { status: 500 });
  }
}
