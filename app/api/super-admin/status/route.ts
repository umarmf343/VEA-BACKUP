import { NextResponse } from "next/server";

import { getServiceStatusSnapshot } from "@/lib/super-admin-service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const snapshot = getServiceStatusSnapshot({ refresh: true });
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error("Super admin service status error:", error);
    return NextResponse.json({ error: "Failed to fetch service status" }, { status: 500 });
  }
}
