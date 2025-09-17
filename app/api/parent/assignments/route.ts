import { NextResponse } from "next/server";

import { listParentAssignments } from "@/lib/parent-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const assignments = listParentAssignments();
    return NextResponse.json({ assignments });
  } catch (error) {
    console.error("Failed to load parent assignments", error);
    return NextResponse.json({ error: "Unable to load assignments." }, { status: 500 });
  }
}
