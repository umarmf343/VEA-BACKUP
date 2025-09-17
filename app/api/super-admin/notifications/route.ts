import { NextRequest, NextResponse } from "next/server";

import {
  archiveNotifications,
  getNotifications,
  setNotificationRead,
} from "@/lib/super-admin-service";

type NotificationAction =
  | "mark-read"
  | "mark-unread"
  | "mark-all-read"
  | "mark-all-unread"
  | "archive";

export const runtime = "nodejs";

export async function GET() {
  try {
    const notifications = getNotifications();
    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("Super admin notifications fetch error:", error);
    return NextResponse.json({ error: "Failed to load notifications" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const action = body?.action as NotificationAction | undefined;
    const ids = Array.isArray(body?.ids) ? (body.ids as string[]) : undefined;

    if (!action) {
      return NextResponse.json({ error: "Action is required" }, { status: 400 });
    }

    const requiresIds = action === "mark-read" || action === "mark-unread" || action === "archive";
    if (requiresIds && (!ids || ids.length === 0)) {
      return NextResponse.json({ error: "Notification ids are required for this action" }, { status: 400 });
    }

    let notifications;

    switch (action) {
      case "mark-read":
        notifications = setNotificationRead(ids, true);
        break;
      case "mark-unread":
        notifications = setNotificationRead(ids, false);
        break;
      case "mark-all-read":
        notifications = setNotificationRead(undefined, true);
        break;
      case "mark-all-unread":
        notifications = setNotificationRead(undefined, false);
        break;
      case "archive":
        notifications = archiveNotifications(ids);
        break;
      default:
        return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
    }

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("Super admin notifications update error:", error);
    return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 });
  }
}
