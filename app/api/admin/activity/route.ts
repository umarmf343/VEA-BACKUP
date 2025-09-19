import { NextRequest, NextResponse } from "next/server";

import { listAdminActivities, type UserRole } from "@/lib/admin-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const role = (searchParams.get("role") as UserRole | null) || undefined;
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;
    const activities = listAdminActivities({ role, limit: Number.isFinite(limit ?? NaN) ? limit : undefined });
    return NextResponse.json({ activities });
  } catch (error) {
    console.error("Admin activity feed error:", error);
    return NextResponse.json({ error: "Failed to load activity feed" }, { status: 500 });
  }
}
