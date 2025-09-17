import { NextResponse } from "next/server";

import { getOverviewMetrics } from "@/lib/super-admin-service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const metrics = getOverviewMetrics();
    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Super admin metrics error:", error);
    return NextResponse.json({ error: "Failed to load super admin metrics" }, { status: 500 });
  }
}
