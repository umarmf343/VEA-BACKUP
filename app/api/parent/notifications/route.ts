import { NextResponse } from "next/server";

import { listParentNotifications } from "@/lib/parent-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const notifications = listParentNotifications();
    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("Failed to load parent notifications", error);
    return NextResponse.json({ error: "Unable to load notifications." }, { status: 500 });
  }
}
