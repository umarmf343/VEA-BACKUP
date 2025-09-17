import { NextResponse } from "next/server";

import { getParentScheduleOverview } from "@/lib/parent-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const schedule = getParentScheduleOverview();
    return NextResponse.json({ schedule });
  } catch (error) {
    console.error("Failed to load parent schedule", error);
    return NextResponse.json({ error: "Unable to load schedule." }, { status: 500 });
  }
}
