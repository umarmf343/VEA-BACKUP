import { NextResponse } from "next/server";

import { listStudentGrades } from "@/lib/student-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const grades = listStudentGrades();
    return NextResponse.json({ grades });
  } catch (error) {
    console.error("Failed to load student grades", error);
    return NextResponse.json({ error: "Failed to load grades." }, { status: 500 });
  }
}
