import { NextResponse } from "next/server";

import { listTeacherAssessments } from "@/lib/teacher-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const assessments = listTeacherAssessments();
    return NextResponse.json({ assessments });
  } catch (error) {
    console.error("Failed to load teacher assessments", error);
    return NextResponse.json({ error: "Failed to load assessments." }, { status: 500 });
  }
}
