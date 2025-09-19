import { NextRequest, NextResponse } from "next/server";

import {
  listAdminNotifications,
  mutateAdminNotifications,
  type UserRole,
} from "@/lib/admin-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const role = (searchParams.get("role") as UserRole | null) || undefined;
    const notifications = listAdminNotifications(role);
    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("Admin notifications error:", error);
    return NextResponse.json({ error: "Failed to load notifications" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const role = (body?.role as UserRole | null) || undefined;
    const action = body?.action as
      | "mark-read"
      | "mark-unread"
      | "mark-all-read"
      | "mark-all-unread"
      | "archive";

    if (!action) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const ids = Array.isArray(body?.ids) ? (body.ids as string[]) : undefined;
    const notifications = mutateAdminNotifications(action, ids, role);
    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("Admin notifications mutation error:", error);
    return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 });
  }
}
