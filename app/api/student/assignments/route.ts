import { NextResponse } from "next/server";

import { listStudentAssignments, listStudentCourses } from "@/lib/student-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [assignments, courses] = [listStudentAssignments(), listStudentCourses()];
    return NextResponse.json({ assignments, courses });
  } catch (error) {
    console.error("Failed to load student assignments", error);
    return NextResponse.json({ error: "Failed to load assignments." }, { status: 500 });
  }
}
