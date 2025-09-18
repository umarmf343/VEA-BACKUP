import { NextResponse } from "next/server";

import { listTeacherClasses } from "@/lib/teacher-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const classes = await listTeacherClasses();
    return NextResponse.json({ classes });
  } catch (error) {
    console.error("Failed to load teacher classes", error);
    return NextResponse.json({ error: "Failed to load classes." }, { status: 500 });
  }
}
