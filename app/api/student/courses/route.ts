import { NextResponse } from "next/server";

import { listStudentCourses } from "@/lib/student-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const courses = listStudentCourses();
    return NextResponse.json({ courses });
  } catch (error) {
    console.error("Failed to load student courses", error);
    return NextResponse.json({ error: "Failed to load courses." }, { status: 500 });
  }
}
