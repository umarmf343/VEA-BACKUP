import { NextResponse } from "next/server";

import { getAdminDashboardSnapshot } from "@/lib/admin-service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const snapshot = getAdminDashboardSnapshot();
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error("Admin dashboard error:", error);
    return NextResponse.json({ error: "Failed to load admin dashboard metrics" }, { status: 500 });
  }
}
