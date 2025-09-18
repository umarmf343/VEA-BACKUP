import { NextResponse } from "next/server";

import { getTeacherDashboardMetrics } from "@/lib/teacher-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const metrics = await getTeacherDashboardMetrics();
    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Failed to load teacher dashboard metrics", error);
    return NextResponse.json({ error: "Failed to load teacher dashboard metrics." }, { status: 500 });
  }
}
