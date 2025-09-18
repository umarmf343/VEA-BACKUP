import { NextResponse } from "next/server";

import { createTeacherAssignment, listTeacherAssignments } from "@/lib/teacher-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const assignments = await listTeacherAssignments();
    return NextResponse.json({ assignments });
  } catch (error) {
    console.error("Failed to load teacher assignments", error);
    return NextResponse.json({ error: "Failed to load assignments." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { title, classId, dueDate, description, resources } = payload ?? {};

    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "Title is required." }, { status: 400 });
    }
    if (!classId || typeof classId !== "string") {
      return NextResponse.json({ error: "classId is required." }, { status: 400 });
    }
    if (!dueDate || typeof dueDate !== "string") {
      return NextResponse.json({ error: "dueDate is required." }, { status: 400 });
    }

    const assignment = await createTeacherAssignment({
      title: title.trim(),
      description: typeof description === "string" ? description.trim() : undefined,
      classId: classId.trim(),
      dueDate,
      resources: Array.isArray(resources) ? resources.map((item: string) => String(item)) : undefined,
    });

    return NextResponse.json({ assignment }, { status: 201 });
  } catch (error) {
    console.error("Failed to create teacher assignment", error);
    return NextResponse.json({ error: "Failed to create assignment." }, { status: 500 });
  }
}
