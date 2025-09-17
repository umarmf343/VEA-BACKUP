import { NextResponse } from "next/server";

import { getStudentDashboardMetrics } from "@/lib/student-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const metrics = getStudentDashboardMetrics();
    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Failed to load student dashboard metrics", error);
    return NextResponse.json({ error: "Failed to load student dashboard metrics." }, { status: 500 });
  }
}
