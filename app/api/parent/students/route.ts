import { NextResponse } from "next/server";

import { listParentStudents } from "@/lib/parent-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const students = listParentStudents();
    return NextResponse.json({ students });
  } catch (error) {
    console.error("Failed to list parent students", error);
    return NextResponse.json({ error: "Unable to load students." }, { status: 500 });
  }
}
