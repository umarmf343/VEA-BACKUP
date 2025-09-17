import { NextResponse } from "next/server";

import { getParentDashboardMetrics } from "@/lib/parent-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const metrics = getParentDashboardMetrics();
    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Failed to load parent dashboard metrics", error);
    return NextResponse.json({ error: "Failed to load parent dashboard metrics." }, { status: 500 });
  }
}
