import { NextRequest, NextResponse } from "next/server";

import { getRecentActivities } from "@/lib/super-admin-service";
import type { Audience } from "@/lib/super-admin-service";

export const runtime = "nodejs";

const ALLOWED_ROLES: Audience[] = [
  "super-admin",
  "admin",
  "teacher",
  "student",
  "parent",
  "librarian",
  "accountant",
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const roleParam = searchParams.get("role");

    const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : Number.NaN;
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 50) : 15;
    const audience = ALLOWED_ROLES.includes(roleParam as Audience)
      ? (roleParam as Audience)
      : undefined;

    const activities = getRecentActivities(limit, audience);
    return NextResponse.json({ activities });
  } catch (error) {
    console.error("Super admin activity error:", error);
    return NextResponse.json({ error: "Failed to load activity feed" }, { status: 500 });
  }
}
