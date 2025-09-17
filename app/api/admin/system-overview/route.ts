import { NextResponse } from "next/server";

import { getAdminOverviewSnapshot } from "@/lib/admin-service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const overview = getAdminOverviewSnapshot();
    return NextResponse.json({ overview });
  } catch (error) {
    console.error("Admin system overview error:", error);
    return NextResponse.json({ error: "Failed to load system overview" }, { status: 500 });
  }
}
