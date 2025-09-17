import { NextResponse } from "next/server";

import { getSystemMetrics } from "@/lib/super-admin-service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const metrics = getSystemMetrics({ refresh: true });
    return NextResponse.json(metrics);
  } catch (error) {
    console.error("System metrics error:", error);
    return NextResponse.json({ error: "Failed to fetch system metrics" }, { status: 500 });
  }
}
