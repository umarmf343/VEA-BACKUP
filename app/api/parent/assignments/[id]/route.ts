import { NextRequest, NextResponse } from "next/server";

import { updateParentAssignmentStatus } from "@/lib/parent-service";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const assignment = updateParentAssignmentStatus(body?.studentId, params.id, body?.status);
    return NextResponse.json(assignment);
  } catch (error: any) {
    console.error("Failed to update parent assignment", error);
    return NextResponse.json({ error: error?.message ?? "Unable to update assignment." }, { status: 400 });
  }
}
